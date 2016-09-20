'use strict';

module.exports = function (config, inciwebid) {
  return `${config.perimeterDatasetNamePrefix}${inciwebid}-perimeters`;
};
