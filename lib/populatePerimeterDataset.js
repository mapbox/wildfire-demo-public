'use strict';
/* eslint-disable no-console */

const retryRequest = require('./retryRequest');
const retryMapboxClient = require('./retryMapboxClient');
const queue = require('d3-queue').queue;
const _ = require('lodash');
const sourcePerimeterToGeoJson = require('./sourcePerimeterToGeoJson');
const getCurrentPerimeter = require('./getCurrentPerimeter');

const CULLING_THRESHOLD = 0.05;
const WILDIRE_API_BASE = 'http://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer';
const PRIOR_PERIMETERS_LAYER = 5;

const perimeterBaseQuery = [
  'f=json',
  'outFields=*',
  'outSR=4326',
];

// For limiting only
const mapboxQueue = queue(20);
const externalQueue = queue(20);

module.exports = function (config, inciwebid, manuallyEnteredPriorPerimeters) {
  const promises = [getCurrentPerimeter(inciwebid, { all: true })];
  if (manuallyEnteredPriorPerimeters) {
    promises.push(Promise.resolve(manuallyEnteredPriorPerimeters));
  } else {
    promises.push(getPriorPerimeters(inciwebid));
  }

  return Promise.all(promises).then((results) => {
    const currentPerimeters = results[0] || [];
    const priorPerimeters = results[1] || [];

    if (currentPerimeters) console.log(`${inciwebid}: Got current perimeters`);
    if (priorPerimeters.length > 0 && !manuallyEnteredPriorPerimeters) console.log(`${inciwebid}: Got prior perimeters`);
    if (priorPerimeters.length > 0 && manuallyEnteredPriorPerimeters) console.log(`${inciwebid}: Manually loaded prior perimeters`);

    if (priorPerimeters.length === 0 && currentPerimeters.length !== 0) {
      return addToRelatedDataset(inciwebid, sourcePerimeterToGeoJson(inciwebid, currentPerimeters[0]), config.mapboxClient);
    }

    if (priorPerimeters.length === 0 && currentPerimeters.length === 0) {
      console.log(`${inciwebid}: No prior perimeters found, so no perimeter dataset alterations`);
      return;
    }

    const allSortedPerimeters = _.orderBy(priorPerimeters.concat(currentPerimeters), (p) => {
      return _.get(p, 'attributes.gisacres', 0);
    }, 'desc');

    const culledPerimeters = cullRawPerimeters(allSortedPerimeters);

    return deleteRelatedDatasets(inciwebid, config.mapboxClient).then(() => {
      return createPerimeterDataset(inciwebid, config.mapboxClient);
    }).then((datasetId) => {
      return new Promise((resolve, reject) => {
        const perimeters = culledPerimeters.map((p) => sourcePerimeterToGeoJson(inciwebid, p))
          .filter((x) => !!x);
        // Need to modify the ids so they are unique
        perimeters.forEach((perimeter) => {
          perimeter.id = `${perimeter.id}-${perimeter.properties.perimeterdatetime}`;
        });
        const q = queue(20);
        const perimeterTotalCount = perimeters.length;
        let perimeterDoneCount = 0;
        perimeters.forEach((perimeter) => {
          q.defer((done) => {
            perimeterDoneCount += 1;
            console.log(`${inciwebid}: Uploading perimeter ${perimeterDoneCount} of ${perimeterTotalCount}`);
            retryMapboxClient(config.mapboxClient, 'insertFeature', [perimeter, datasetId], done);
          });
        });
        q.awaitAll((err) => {
          if (err) return reject(new Error(err.message));
          console.log(`${inciwebid}: Done uploading perimeters`);
          resolve(datasetId);
        });
      });
    });
  });
};

function getPriorPerimeters(inciwebid) {
  return new Promise((resolve, reject) => {
    externalQueue.defer((done) => {
      const query = perimeterBaseQuery.concat(`where=inciwebid='${inciwebid}'`).join('&');
      const url = `${WILDIRE_API_BASE}/${PRIOR_PERIMETERS_LAYER}/query?${query}`;
      retryRequest(url, (err, response, body) => {
        done();
        if (err) {
          console.log(`${inciwebid}: Failed to get prior perimeters ${err.message}`);
          return resolve();
        }
        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          return reject(e);
        }
        const perimeters = _.get(parsedBody, 'features');
        resolve(perimeters);
      });
    });
  });
}

function createPerimeterDataset(inciwebid, mapboxClient) {
  return new Promise((resolve, reject) => {
    mapboxQueue.defer((done) => {
      console.log(`${inciwebid}: Creating dataset for perimeters`);
      retryMapboxClient(mapboxClient, 'createDataset', [{ name: `${inciwebid}-perimeters` }], (err, dataset) => {
        done();
        if (err) return reject(new Error(err.message));
        resolve(dataset.id);
      });
    });
  });
}

function addToRelatedDataset(inciwebid, perimeter, mapboxClient) {
  return new Promise((resolve, reject) => {
    mapboxQueue.defer((done) => {
      retryMapboxClient(mapboxClient, 'listDatasets', [], (err, datasets) => {
        if (err) {
          console.log(`${inciwebid}: Failed to list datasets`);
          return reject(new Error(err.message));
        }

        const relatedDataset = datasets.find((dataset) => {
          return dataset.name && dataset.name.indexOf(inciwebid) !== -1;
        });

        if (relatedDataset) {
          console.log(`${inciwebid}: Adding perimeter to existing perimeter dataset`);
          retryMapboxClient(mapboxClient, 'insertFeature', [perimeter, relatedDataset.id], (err) => {
            done();
            if (err) return reject(new Error(err.message));
            console.log(`${inciwebid}: Done adding perimeter to existing perimeter dataset`);
            resolve();
          });
        } else {
          console.log(`${inciwebid}: Creating new perimeter dataset and adding perimeter to it`);
          createPerimeterDataset(inciwebid, mapboxClient).then((datasetId) => {
            retryMapboxClient(mapboxClient, 'insertFeature', [perimeter, datasetId], (err) => {
              done();
              if (err) return reject(new Error(err.message));
              console.log(`${inciwebid}: Done adding perimeter to existing perimeter dataset`);
              resolve();
            });
          }).catch(reject);
        }
      });
    });
  });
}

function deleteRelatedDatasets(inciwebid, mapboxClient) {
  return new Promise((resolve, reject) => {
    console.log(`${inciwebid}: Deleting prior perimeter datasets`);
    mapboxQueue.defer((done) => {
      retryMapboxClient(mapboxClient, 'listDatasets', [], (err, datasets) => {
        done();
        if (err) {
          console.log(`${inciwebid}: Failed to list datasets`);
          return reject(new Error(err.message));
        }

        try {
          const relatedDatasets = datasets.filter((dataset) => {
            return dataset.name && dataset.name.indexOf(inciwebid) !== -1;
          });
          const relatedDatasetIds = relatedDatasets.map((dataset) => dataset.id);
          const promises = relatedDatasetIds.map((id) => deleteDataset(id, mapboxClient));
          resolve(Promise.all(promises));
        } catch (e) {
          reject(e);
        }
      });
    });
  });
}

function deleteDataset(datasetId, mapboxClient) {
  return new Promise((resolve, reject) => {
    mapboxQueue.defer((done) => {
      retryMapboxClient(mapboxClient, 'deleteDataset', [datasetId], (err) => {
        done();
        if (err) {
          console.log(`Failed to delete dataset ${datasetId}`);
          return reject(new Error(err.message));
        }
        resolve();
      });
    });
  });
}

function cullRawPerimeters(perimeters) {
  const result = [];
  let priorSize = 0;
  perimeters.forEach((perimeter, index) => {
    if (index === 0 || index === perimeters.length - 1) {
      return result.push(perimeter);
    }
    const size = perimeter.attributes.gisacres;
    if (size <= priorSize * (1 - CULLING_THRESHOLD) || size >= priorSize * (1 + CULLING_THRESHOLD)) {
      result.push(perimeter);
      priorSize = size;
    }
  });
  return result;
}
