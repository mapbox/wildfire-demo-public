'use strict';

const _ = require('lodash');

module.exports = function (perimeters) {
  return _.orderBy(perimeters, (perimeter) => {
    return _.get(perimeter, 'attributes.gisacres', 0);
  }, 'desc');
};
