'use strict';

const retryRequest = require('./retryRequest');
const getCurrentPerimeter = require('./getCurrentPerimeter');
const _ = require('lodash');
const queue = require('d3-queue').queue;

// Used for limiting only
const q = queue(20);

const WILDIRE_API_BASE = 'http://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer';
const PRIOR_PERIMETERS_LAYER = 5;

const maxSizeBaseQuery = [
  'f=json',
  'outStatistics=[{ "statisticType": "max", "onStatisticField": "gisacres", "outStatisticFieldName": "maxgisacres" }]',
];

function getPriorPerimetersMaxSize(inciwebid) {
  return new Promise((resolve, reject) => {
    const query = maxSizeBaseQuery.concat(`where=inciwebid='${inciwebid}'`).join('&');
    const url = `${WILDIRE_API_BASE}/${PRIOR_PERIMETERS_LAYER}/query?${query}`;
    q.defer((done) => {
      retryRequest(url, (err, response, body) => {
        done();
        if (err) return reject(err);
        resolve(_.get(JSON.parse(body), 'features[0].attributes.maxgisacres'));
      });
    });
  });
}

const perimeterBySizeBaseQuery = [
  'f=json',
  'outFields=*',
  'outSR=4326',
];

function getPriorPerimeterBySize(size) {
  return new Promise((resolve, reject) => {
    const query = perimeterBySizeBaseQuery.concat(`where=gisacres=${size}`).join('&');
    const url = `${WILDIRE_API_BASE}/${PRIOR_PERIMETERS_LAYER}/query?${query}`;
    q.defer((done) => {
      retryRequest(url, (err, response, body) => {
        done();
        if (err) return reject(err);

        try {
          const perimeter = _.get(JSON.parse(body), 'features[0]');
          resolve(perimeter);
        } catch (e) {
          return reject(e);
        }
      });
    });
  });
}

function getLargestPriorPerimeter(inciwebid) {
  return getPriorPerimetersMaxSize(inciwebid).then(getPriorPerimeterBySize);
}

module.exports = function (inciwebid) {
  return Promise.all([
    getCurrentPerimeter(inciwebid),
    getLargestPriorPerimeter(inciwebid),
  ]).then((results) => {
    const sortedPerimeters = _.orderBy(results, (p) => _.get(p, 'attributes.gisacres', 0), 'desc');
    return sortedPerimeters[0];
  });
};
