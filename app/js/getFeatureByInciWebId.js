'use strict';

const constants = require('./constants');

function getFeature(inciwebid, map, point) {
  const pointOperator = (point) ? '==' : '!=';
  return map.querySourceFeatures('composite', {
    sourceLayer: constants.DATASET_NAME,
    filter: [
      'all',
      ['==', 'inciwebid', inciwebid],
      [pointOperator, '$type', 'Point'],
    ],
  });
}

module.exports = {
  point(inciwebid, map) {
    return getFeature(inciwebid, map, true)[0];
  },
  perimeters(inciwebid, map) {
    return getFeature(inciwebid, map, false);
  },
};
