'use strict';
/* eslint-disable no-console */

const streambot = require('streambot');
const update = require('./lib/update');
const listFeaturesByInciwebid = require('./lib/listFeaturesByInciwebid');
const listArticlesByInciwebid = require('./lib/listArticlesByInciwebid');

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

module.exports.perimeterProxy = function (apiEvent, context, callback) {
  listFeaturesByInciwebid(apiEvent)
    .then((features) => {
      callback(null, features);
    })
    .catch((err) => {
      callback(err);
    });
};

module.exports.articlesProxy = function (apiEvent, context, callback) {
  listArticlesByInciwebid(apiEvent)
    .then((articles) => {
      callback(null, articles);
    })
    .catch((err) => {
      callback(err);
    });
};
