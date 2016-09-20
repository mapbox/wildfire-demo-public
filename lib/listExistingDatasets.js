/* eslint-disable no-console */
'use strict';

const _ = require('lodash');
const prudentMapboxClient = require('./prudentMapboxClient');

module.exports = _.memoize((config) => {
  return prudentMapboxClient(config.mapboxClient, 'listDatasets', [])
    .then((data) => {
      return data[0];
    });
});
