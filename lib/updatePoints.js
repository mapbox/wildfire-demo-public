/* eslint-disable no-console */
'use strict';

const chalk = require('chalk');
const _ = require('lodash');
const getIncidentPoints = require('./getIncidentPoints');
const prudentMapboxClient = require('./prudentMapboxClient');
const getMaxPerimeter = require('./getMaxPerimeter');

module.exports = function (config) {
  return getIncidentPoints()
    .then((points) => {
      return Promise.all(points.map(addAreaToPoint));
    })
    .then((points) => {
      return putPoints(config, points);
    })
    .then(() => {
      return updatePointsTileset(config);
    });
};

function addAreaToPoint(point) {
  const inciwebid = point.properties.inciwebid;
  return getMaxPerimeter(inciwebid).then((maxPerimeter) => {
    point.properties.acres = _.get(maxPerimeter, 'attributes.gisacres', 0);
    return point;
  });
}

function putPoints(config, points) {
  console.log('Updating points dataset ...');
  return prudentMapboxClient(config.mapboxClient, 'batchFeatureUpdate', [
    { put: points },
    config.pointsDatasetId,
  ]).then(() => {
    console.log(chalk.green('Successfully updated points dataset'));
  });
}

function updatePointsTileset(config) {
  console.log('Updating points tileset ...');
  return prudentMapboxClient(config.mapboxClient, 'createUpload', [{
    tileset: `${config.ownerId}.${config.pointsDatasetId}`,
    name: config.pointsTilesetName,
    url: `mapbox://datasets/${config.ownerId}/${config.pointsDatasetId}`,
  }]).then(() => {
    console.log(chalk.green('Successfully initiated points tileset update'));
  });
}
