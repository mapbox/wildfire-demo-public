'use strict';
/* eslint-disable no-console */

const retryRequest = require('./retryRequest');
const retryMapboxClient = require('./retryMapboxClient');
const bbox = require('@turf/bbox');
const queue = require('d3-queue').queue;
const _ = require('lodash');
const getLargestPerimeter = require('./getLargestPerimeter');
const populatePerimeterDataset = require('./populatePerimeterDataset');
const sourcePerimeterToGeoJson = require('./sourcePerimeterToGeoJson');
const getRssItems = require('./getRssItems');
const getArticleFeed = require('./getArticleFeed');

const FANCY_PERIMETER_THRESHOLD = 10000;
const INCIDENTS_FEED_URL = 'http://inciweb.nwcg.gov/feeds/rss/incidents/';

const insertQueue = queue(20);
let incidentsTotalCount = 0;
let incidentsDoneCount = 0;
const incidentInciwebids = new Set();

// For testing
function incidentFilter(rawIncidents) {
  return rawIncidents;
  // const testIncidents = new Set([
  //   // '4921',
  //   // '4974',
  //   // '4975',
  //   '4986',
  // ]);
  // return rawIncidents.filter((rawIncident) => {
  //   const incidentUrl = rawIncident.link[0];
  //   const inciwebid = String(incidentUrl.split('/').filter((x) => !!x).slice(-1));
  //   return testIncidents.has(inciwebid);
  // });
}

module.exports = function (config) {
  console.log('>> Fetching data ...');

  return getIncidents().then((allIncidents) => {
    if (!allIncidents) throw new Error('No incidents found');
    const incidents = incidentFilter(allIncidents);
    incidentsTotalCount = incidents.length;

    console.log(`>> Processing ${incidentsTotalCount} incidents ...`);
    const promises = incidents.map((incident) => updateIncident(config, incident));
    return Promise.all(promises);
  }).then(() => {
    console.log('Mission accomplished.');
  });
};

function getIncidents() {
  return new Promise((resolve, reject) => {
    retryRequest(INCIDENTS_FEED_URL, (err, response, body) => {
      if (err) return reject(err);
      resolve(getRssItems(body));
    });
  });
}

function updateIncident(config, rawIncident) {
  const incidentUrl = rawIncident.link[0];
  const inciwebid = String(incidentUrl.split('/').filter((x) => !!x).slice(-1));
  const incidentTitle = rawIncident.title[0];
  const legibleName = `"${incidentTitle}" (${inciwebid})`;
  const incidentCoordinates = [
    Number(rawIncident['geo:long'][0]),
    Number(rawIncident['geo:lat'][0]),
  ];

  incidentInciwebids.add(inciwebid);

  if (isNaN(incidentCoordinates[0]) || isNaN(incidentCoordinates[1])) {
    incidentsDoneCount += 1;
    incidentInciwebids.delete(inciwebid);
    console.log(`${inciwebid}: Bad coordinates for incident ${legibleName}`);
    return;
  }

  const incidentFeature = {
    type: 'Feature',
    id: inciwebid,
    properties: {
      inciwebid,
      title: incidentTitle,
      published: rawIncident.published[0],
      description: rawIncident.description ? rawIncident.description[0] : null,
      url: incidentUrl,
    },
    geometry: {
      type: 'Point',
      coordinates: incidentCoordinates,
    },
  };

  return Promise.all([
    getArticleFeed(inciwebid),
    getLargestPerimeter(inciwebid),
  ]).then((results) => {
    return new Promise((resolve) => {
      const articleFeed = results[0];
      const rawPerimeter = results[1];
      const featuresToAdd = [incidentFeature];

      if (articleFeed) {
        incidentFeature.properties.articles = JSON.stringify(articleFeed);
      }

      incidentFeature.properties.gisacres = _.get(rawPerimeter, 'attributes.gisacres', 0);
      if (rawPerimeter) {
        const perimeter = sourcePerimeterToGeoJson(inciwebid, rawPerimeter);
        incidentFeature.properties.perimeterExtent = JSON.stringify(bbox(perimeter));
        featuresToAdd.push(perimeter);
      }

      let count = 0;
      let doneCount = 0;
      function insertFeature(feature) {
        return new Promise((resolve, reject) => {
          insertQueue.defer((done) => {
            count += 1;
            console.log(`${inciwebid}: Uploading feature ${count} of ${featuresToAdd.length}`);
            retryMapboxClient(config.mapboxClient, 'insertFeature', [feature, config.datasetId], finish);

            function finish(err) {
              done();
              if (err) console.log(`${inciwebid}: Failed to insert feature`);
              doneCount += 1;
              console.log(`${inciwebid}: Done with ${doneCount} of ${featuresToAdd.length} features`);
              if (doneCount === featuresToAdd.length) {
                incidentsDoneCount += 1;
                incidentInciwebids.delete(inciwebid);
                console.log(`${inciwebid}: Finished -- incident ${incidentsDoneCount} of ${incidentsTotalCount}`);
                console.log(`Incidents still to go: ${Array.from(incidentInciwebids).join(', ')}`);
              }
              if (err) return reject(err);
              resolve();
            }
          });
        });
      }

      if (incidentFeature.properties.gisacres < FANCY_PERIMETER_THRESHOLD) {
        console.log(`${inciwebid}: Queueing ${featuresToAdd.length} features`);
        return resolve(Promise.all(featuresToAdd.map(insertFeature)));
      }

      return populatePerimeterDataset(config, inciwebid).then((datasetId) => {
        let message = `${inciwebid}: Queueing ${featuresToAdd.length} features`;
        if (datasetId) incidentFeature.properties.perimeterDatasetId = datasetId;
        if (datasetId) message += ' with perimeters';
        console.log(message);
        return resolve(Promise.all(featuresToAdd.map(insertFeature)));
      });
    });
  });
}
