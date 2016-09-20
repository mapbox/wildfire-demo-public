'use strict';

const prudentRequest = require('./prudentRequest');
const _ = require('lodash');

const PERIMETER_API_BASE = 'http://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer/1/query?';

const currentPerimeterBaseQuery = [
  'f=json',
  'outSR=4326',
  'outFields=*',
];

module.exports = function (inciwebid, options) {
  options = options || {};
  const query = currentPerimeterBaseQuery.concat(`where=inciwebid='${inciwebid}'`).join('&');
  const url = `${PERIMETER_API_BASE}${query}`;
  return prudentRequest(url).then((data) => {
    const perimeters = _.get(JSON.parse(data.body), 'features');
    if (options.all) return perimeters;

    const sortedPerimeters = _.orderBy(perimeters, (perimeter) => {
      return _.get(perimeter, 'attributes.perimeterdatetime', 0);
    }, 'desc');

    return sortedPerimeters[0];
  });
};
