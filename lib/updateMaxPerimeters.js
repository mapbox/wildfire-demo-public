/* eslint-disable no-console */
'use strict';

const _ = require('lodash');
const chalk = require('chalk');
const queue = require('d3-queue').queue;
const getIncidentPoints = require('./getIncidentPoints');
const prudentMapboxClient = require('./prudentMapboxClient');
const getMaxPerimeter = require('./getMaxPerimeter');
const sourcePerimeterToGeoJson = require('./sourcePerimeterToGeoJson');

module.exports = function (config) {
  return getIncidentPoints()
    .then((points) => {
      return Promise.all(points.map(getMaxPerimeterFeature));
    })
    .then(_.compact)
    .then((maxPerimeters) => {
      return putMaxPerimeters(config, maxPerimeters);
    })
    .then(() => {
      return updateMaxPerimetersTileset(config);
    });
};

function getMaxPerimeterFeature(point) {
  const inciwebid = point.properties.inciwebid;
  return getMaxPerimeter(inciwebid).then((maxPerimeter) => {
    if (!maxPerimeter) return null;
    return Object.assign(sourcePerimeterToGeoJson(maxPerimeter), {
      id: `${inciwebid}-max-perimeter`,
    });
  });
}

function putMaxPerimeters(config, maxPerimeters) {
  return new Promise((resolve, reject) => {
    console.log('Updating max perimeters dataset ...');
    const putQueue = queue(20);

    maxPerimeters.forEach((maxPerimeter) => {
      putQueue.defer((next) => {
        prudentMapboxClient(config.mapboxClient, 'insertFeature', [
          maxPerimeter,
          config.maxPerimetersDatasetId,
        ]).then(() => {
          next();
        }).catch(next);
      });
    });

    putQueue.awaitAll((err) => {
      if (err) {
        console.log(chalk.red.bold('Failed to update max perimeters dataset'));
        return reject(new Error(err.message));
      }
      console.log(chalk.green('Successfully updated max perimeters dataset'));
      resolve(maxPerimeters);
    });
  });
}

function updateMaxPerimetersTileset(config) {
  console.log('Updating max perimeters tileset ...');
  return prudentMapboxClient(config.mapboxClient, 'createUpload', [{
    tileset: `${config.ownerId}.${config.maxPerimetersDatasetId}`,
    name: config.maxPerimetersTilesetName,
    url: `mapbox://datasets/${config.ownerId}/${config.maxPerimetersDatasetId}`,
  }]).then(() => {
    console.log(chalk.green('Successfully initiated max perimeters tileset update'));
  });
}
