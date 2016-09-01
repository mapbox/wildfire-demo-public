'use strict';

const retryRequest = require('./retryRequest');
const _ = require('lodash');
const queue = require('d3-queue').queue;

// Used for limiting only
const q = queue(20);

const currentPerimeterBaseQuery = [
  'f=json',
  'outSR=4326',
  'outFields=*',
];

module.exports = function (inciwebid, options) {
  options = options || {};
  return new Promise((resolve, reject) => {
    const query = currentPerimeterBaseQuery.concat(`where=inciwebid='${inciwebid}'`).join('&');
    const url = `http://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer/1/query?${query}`;
    q.defer((done) => {
      retryRequest(url, (err, response, body) => {
        done();
        if (err) return reject(err);

        try {
          const perimeters = _.get(JSON.parse(body), 'features');
          if (options.all) return resolve(perimeters);

          const sortedPerimeters = _.orderBy(perimeters, (perimeter) => {
            return _.get(perimeter, 'attributes.perimeterdatetime', 0);
          }, 'desc');
          resolve(sortedPerimeters[0]);
        } catch (e) {
          return reject(e);
        }
      });
    });
  });
};
