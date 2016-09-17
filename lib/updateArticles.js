/* eslint-disable no-console */
'use strict';

const chalk = require('chalk');
const getIncidentPoints = require('./getIncidentPoints');
const getArticleFeed = require('./getArticleFeed');
const prudentMapboxClient = require('./prudentMapboxClient');

module.exports = function (config) {
  return getIncidentPoints().then((points) => {
    const promises = points.map((point) => {
      return addArticlesToPoints(config, point);
    });

    return Promise.all(promises).then((articles) => {
      return putArticles(config, articles);
    });
  });
};

function addArticlesToPoints(config, point) {
  const inciwebid = point.properties.inciwebid;
  return getArticleFeed(inciwebid).then((articles) => {
    const result = Object.assign({}, point, {
      id: `${inciwebid}-articles`,
      properties: Object.assign({}, point.properties, {
        articles: JSON.stringify(articles),
      }),
    });

    return result;
  });
}

function putArticles(config, articles) {
  console.log('Updating articles dataset ...');
  return prudentMapboxClient(config.mapboxClient, 'batchFeatureUpdate', [
    { put: articles },
    config.articlesDatasetId,
  ]).then(() => {
    console.log(chalk.green('Successfully updated articles dataset'));
  });
}
