/* eslint-disable no-console */
'use strict';

const MapboxClient = require('mapbox');
const getPerimeterDatasetName = require('./getPerimeterDatasetName') ;

module.exports = function (apiEvent) {
  const inciwebid = apiEvent.inciwebid;
  const client = new MapboxClient(apiEvent.mapboxAccessToken);

  function listDatasets() {
    return new Promise((resolve, reject) => {
      console.time('list datasets');
      client.listDatasets((err, datasets) => {
        console.timeEnd('list datasets');
        if (err) return reject(new Error(err));
        resolve(datasets);
      });
    });
  }

  function getDatasetId(inciwebid) {
    return listDatasets().then((datasets) => {
      const perimeterDataset = datasets.find((dataset) => {
        return dataset.name === getPerimeterDatasetName(apiEvent, inciwebid);
      });
      if (!perimeterDataset) return;
      return perimeterDataset.id;
    });
  }

  function listFeatures(datasetId, options) {
    options = options || {};
    return new Promise((resolve, reject) => {
      console.time(`list features ${datasetId}`);
      client.listFeatures(datasetId, options, (err, features) => {
        console.timeEnd(`list features ${datasetId}`);
        if (err) return reject(new Error(err));
        resolve(features);
      });
    });
  }

  function listAllFeatures(datasetId) {
    const collection = { type: 'FeatureCollection', features: [] };
    if (!datasetId) return collection;

    function accumulateFeatures(nextCollection) {
      const nextFeatures = nextCollection.features;
      if (nextFeatures.length === 0) return collection;
      collection.features = collection.features.concat(nextFeatures);
      const lastFeature = nextFeatures[nextFeatures.length - 1];
      return listFeatures(datasetId, { start: lastFeature.id })
        .then(accumulateFeatures);
    }

    return listFeatures(datasetId).then(accumulateFeatures);
  }

  return getDatasetId(inciwebid)
    .then((datasetId) => listAllFeatures(datasetId));
};
