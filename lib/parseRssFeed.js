'use strict';

const xml2js = require('xml2js');
const _ = require('lodash');

module.exports = function (xml) {
  return parseXml(xml).then((parsed) => {
    return _.get(parsed, 'rss.channel[0].item');
  });
};

function parseXml(xml) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}
