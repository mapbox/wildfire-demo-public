'use strict';

const MapboxClient = require('mapbox');
const updatePoints = require('./updatePoints');
const updateMaxPerimeters = require('./updateMaxPerimeters');
const updatePerimeters = require('./updatePerimeters');

module.exports = function (config) {
  config = config || {};
  config.mapboxClient = config.mapboxClient || new MapboxClient(config.mapboxAccessToken);

  return Promise.all([
    updatePoints(config),
    updateMaxPerimeters(config),
    updatePerimeters(config),
  ]);
};
