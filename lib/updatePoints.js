/* eslint-disable no-console */
'use strict';

const chalk = require('chalk');
const _ = require('lodash');
const bbox = require('@turf/bbox');
const getIncidentPoints = require('./getIncidentPoints');
const prudentMapboxClient = require('./prudentMapboxClient');
const getMaxPerimeter = require('./getMaxPerimeter');
const sourcePerimeterToGeoJson = require('./sourcePerimeterToGeoJson');

module.exports = function (config) {
  return getIncidentPoints()
    .then((points) => {
      return Promise.all(points.map(addPerimeterDataToPoint));
    })
    .then((points) => {
      return putPoints(config, points);
    })
    .then(() => {
      return updatePointsTileset(config);
    });
};

function addPerimeterDataToPoint(point) {
  const inciwebid = point.properties.inciwebid;
  return getMaxPerimeter(inciwebid).then((maxPerimeter) => {
    point.properties.acres = _.get(maxPerimeter, 'attributes.gisacres', 0);
    if (maxPerimeter) {
      point.properties.perimeterExtent = JSON.stringify(bbox(sourcePerimeterToGeoJson(maxPerimeter)));
    }
    return point;
  });
}

function putPoints(config, points) {
  console.log('Updating points dataset ...');

  const putPoints = points.map((point) => {
    return prudentMapboxClient(config.mapboxClient, 'insertFeature', [
      point,
      config.pointsDatasetId,
    ]);
  });

  return Promise.all(putPoints).then(() => {
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
