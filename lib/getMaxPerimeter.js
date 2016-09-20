'use strict';

const _ = require('lodash');
const prudentRequest = require('./prudentRequest');
const getCurrentPerimeter = require('./getCurrentPerimeter');
const sortRawPerimetersBySize = require('./sortRawPerimetersBySize');

const WILDIRE_API_BASE = 'http://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer';
const PRIOR_PERIMETERS_LAYER = 5;

const maxSizeBaseQuery = [
  'f=json',
  'outStatistics=[{ "statisticType": "max", "onStatisticField": "gisacres", "outStatisticFieldName": "maxgisacres" }]',
];

function getPriorPerimetersMaxSize(inciwebid) {
  const query = maxSizeBaseQuery.concat(`where=inciwebid='${inciwebid}'`).join('&');
  const url = `${WILDIRE_API_BASE}/${PRIOR_PERIMETERS_LAYER}/query?${query}`;
  return prudentRequest(url).then((data) => {
    return _.get(JSON.parse(data.body), 'features[0].attributes.maxgisacres');
  });
}

const perimeterBySizeBaseQuery = [
  'f=json',
  'outFields=*',
  'outSR=4326',
];

function getPriorPerimeterBySize(size) {
  const query = perimeterBySizeBaseQuery.concat(`where=gisacres=${size}`).join('&');
  const url = `${WILDIRE_API_BASE}/${PRIOR_PERIMETERS_LAYER}/query?${query}`;
  return prudentRequest(url).then((data) => {
    return _.get(JSON.parse(data.body), 'features[0]');
  });
}

function getLargestPriorPerimeter(inciwebid) {
  return getPriorPerimetersMaxSize(inciwebid)
    .then(getPriorPerimeterBySize);
}

module.exports = _.memoize((inciwebid) => {
  return Promise.all([
    getCurrentPerimeter(inciwebid),
    getLargestPriorPerimeter(inciwebid),
  ]).then((perimeters) => {
    return sortRawPerimetersBySize(perimeters)[0];
  });
});
