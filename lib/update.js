'use strict';
/* eslint-disable no-console */

const MapboxClient = require('mapbox');
const updateIncidents = require('./updateIncidents');
const updateTileset = require('./updateTileset');

// config.datasetId
// config.ownerId
// config.mapboxAccessToken
module.exports = function (config) {
  config = config || {};
  config.mapboxClient = config.mapboxClient || new MapboxClient(config.mapboxAccessToken);
  return updateIncidents(config)
    .then(() => {
      return updateTileset(config);
    });
};
