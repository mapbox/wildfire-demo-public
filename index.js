'use strict';
/* eslint-disable no-console */

const streambot = require('streambot');
const update = require('./lib/update');
const listFeaturesByInciwebid = require('./lib/listFeaturesByInciwebid');

module.exports.update = streambot((event, callback) => {
  update({
    datasetId: process.env.wildfireDatasetId,
    ownerId: process.env.wildfireOwnerId,
    mapboxAccessToken: process.env.wildfireMapboxAccessToken,
  })
    .then(() => {
      console.log('Successful update');
      callback();
    })
    .catch((err) => {
      console.log('Failed update');
      console.log(err);
      if (err.stack) console.log(err.stack);
      if (err instanceof Error) {
        callback(err);
      } else {
        callback(new Error(err && err.message));
      }
    });
});

module.exports.proxy = function (event, context, callback) {
  listFeaturesByInciwebid(event)
    .then((features) => {
      callback(null, features);
    })
    .catch((err) => {
      callback(err);
    });
};
