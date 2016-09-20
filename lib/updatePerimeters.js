/* eslint-disable no-console */
'use strict';

const chalk = require('chalk');
const _ = require('lodash');
const prudentRequest = require('./prudentRequest');
const prudentMapboxClient = require('./prudentMapboxClient');
const sourcePerimeterToGeoJson = require('./sourcePerimeterToGeoJson');
const getCurrentPerimeter = require('./getCurrentPerimeter');
const sortRawPerimetersBySize = require('./sortRawPerimetersBySize');
const listExistingDatasets = require('./listExistingDatasets');
const getIncidentPoints = require('./getIncidentPoints');
const getPerimeterDatasetName = require('./getPerimeterDatasetName');

const CULLING_THRESHOLD_BASE = 0.05;
const WILDIRE_API_BASE = 'http://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer';
const PRIOR_PERIMETERS_LAYER = 5;

module.exports = function (config, inciwebid, manualPriorPerimeters) {
  if (inciwebid || manualPriorPerimeters) {
    return updatePerimeterDataset(config, inciwebid, manualPriorPerimeters);
  }

  return getIncidentPoints()
    .then((points) => {
      return Promise.all(points.map((point) => {
        const inciwebid = point.properties.inciwebid;
        return updatePerimeterDataset(config, inciwebid);
      }));
    })
    .then(() => {
      console.log(chalk.green('Successfully updated perimeter datasets'));
    });
};

const perimeterBaseQuery = [
  'f=json',
  'outFields=*',
  'outSR=4326',
];

function updatePerimeterDataset(config, inciwebid, manualPriorPerimeters) {
  const dataPromises = [getCurrentPerimeter(inciwebid, { all: true })];

  if (manualPriorPerimeters) {
    console.log(`${inciwebid}: Using manually entered prior perimeters`);
    dataPromises.push(Promise.resolve(manualPriorPerimeters));
  } else {
    dataPromises.push(getPriorPerimeters(inciwebid));
  }

  return Promise.all(dataPromises).then((data) => {
    const currentPerimeters = data[0] || [];
    const priorPerimeters = data[1] || [];

    if (priorPerimeters.length === 0) {
      console.log(chalk.yellow(`${inciwebid}: No prior perimeters found, so no perimeter dataset alterations`));
      return;
    }

    const allSortedPerimeters = sortRawPerimetersBySize(priorPerimeters.concat(currentPerimeters));
    const culledPerimeters = cullRawPerimeters(allSortedPerimeters, CULLING_THRESHOLD_BASE);

    return deleteRelatedDatasets(config, inciwebid)
      .then(() => {
        return createPerimeterDataset(config, inciwebid);
      })
      .then((datasetId) => {
        const perimeters = _.compact(culledPerimeters.map((perimeter) => sourcePerimeterToGeoJson(perimeter)));

        // Give each a unique id
        perimeters.forEach((perimeter) => {
          perimeter.id = `${perimeter.properties.inciwebid}-perimeter-${perimeter.properties.perimeterdatetime}`;
        });

        return Promise.all(perimeters.map((perimeter) => {
          return prudentMapboxClient(config.mapboxClient, 'insertFeature', [perimeter, datasetId]);
        }));
      });
  });
}

function getPriorPerimeters(inciwebid) {
  const query = perimeterBaseQuery.concat(`where=inciwebid='${inciwebid}'`).join('&');
  const url = `${WILDIRE_API_BASE}/${PRIOR_PERIMETERS_LAYER}/query?${query}`;
  return prudentRequest(url)
    .then((data) => {
      return _.get(JSON.parse(data.body), 'features');
    })
    .catch(() => {
      console.log(chalk.red(`${inciwebid}: Failed to get prior perimeters -- needs a manual update`));
    });
}

function createPerimeterDataset(config, inciwebid) {
  const datasetInfo = {
    name: getPerimeterDatasetName(config, inciwebid),
  };
  return prudentMapboxClient(config.mapboxClient, 'createDataset', [datasetInfo])
    .then((data) => {
      const dataset = data[0];
      return dataset.id;
    });
}

function deleteRelatedDatasets(config, inciwebid) {
  return listExistingDatasets(config).then((existingDatasets) => {
    const expendableDatasetName = getPerimeterDatasetName(config, inciwebid);
    const priorDatasets = existingDatasets.filter((dataset) => dataset.name === expendableDatasetName);
    if (!priorDatasets) return;

    return Promise.all(priorDatasets.map((priorDataset) => {
      return prudentMapboxClient(config.mapboxClient, 'deleteDataset', [priorDataset.id])
        .catch(() => {
          console.log(chalk.red(`${inciwebid}: Failed to delete dataset name "${expendableDatasetName}", id "${priorDataset.id}"`));
        });
    }));
  });
}

function cullRawPerimeters(perimeters, cullingThreshold) {
  const culledPerimeters = [];
  const firstPerimeterSize = perimeters[0].attributes.gisacres;
  const lastPerimeterSize = perimeters[perimeters.length - 1].attributes.gisacres;
  let priorSize = 0;
  perimeters.forEach((perimeter, index) => {
    if (index === 0 || index === perimeters.length - 1) {
      return culledPerimeters.push(perimeter);
    }
    const size = perimeter.attributes.gisacres;
    if (size === priorSize) return;
    if (size === lastPerimeterSize || size === firstPerimeterSize) return;
    if (size <= priorSize * (1 - cullingThreshold) || size >= priorSize * (1 + cullingThreshold)) {
      culledPerimeters.push(perimeter);
      priorSize = size;
    }
  });
  // Don't need more than 15 perimeters for the effect,
  // and too many can cause the API response to break
  if (culledPerimeters.length > 15) {
    const higherCullingThreshold = cullingThreshold + 0.05;
    return cullRawPerimeters(perimeters, higherCullingThreshold);
  }
  return culledPerimeters;
}
