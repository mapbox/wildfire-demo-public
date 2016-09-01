'use strict';

module.exports = function (date) {
  if (date instanceof Date === false) {
    date = new Date(date);
  }
  return date.toString()
    .replace(/(\d{2}:\d{2}):\d{2}/, '$1')
    .replace(/\s+GMT-\d+\s+/, ' ');
};
