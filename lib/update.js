'use strict';

const MapboxClient = require('mapbox');
const updatePoints = require('./updatePoints');
const updateMaxPerimeters = require('./updateMaxPerimeters');
const updatePerimeters = require('./updatePerimeters');
const deleteStaleData = require('./deleteStaleData');

module.exports = function (config) {
  config = config || {};
  config.mapboxClient = config.mapboxClient || new MapboxClient(config.mapboxAccessToken);
  return Promise.all([
    deleteStaleData(config),
    updatePoints(config),
    updateMaxPerimeters(config),
    updatePerimeters(config),
  ]);
};
