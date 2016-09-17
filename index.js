'use strict';
/* eslint-disable no-console */

const streambot = require('streambot');
const update = require('./lib/update');
const listFeaturesByInciwebid = require('./lib/listFeaturesByInciwebid');

module.exports.update = streambot((event, callback) => {
  update({
    ownerId: process.env.ownerId,
    mapboxAccessToken: process.env.mapboxAccessToken,
    pointsDatasetId: process.env.pointsDatasetId,
    pointsTilesetName: process.env.pointsTilesetName,
    articlesDatasetId: process.env.articlesDatasetId,
    maxPerimetersDatasetId: process.env.maxPerimetersDatasetId,
    maxPerimetersTilesetName: process.env.maxPerimetersTilesetName,
    perimeterDatasetNamePrefix: process.env.perimeterDatasetNamePrefix,
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
