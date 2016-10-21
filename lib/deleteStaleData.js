/* eslint-disable no-console */
'use strict';

const chalk = require('chalk');
const listExistingDatasets = require('./listExistingDatasets');
const prudentMapboxClient = require('./prudentMapboxClient');

const cutOffDate = new Date();
cutOffDate.setMonth(cutOffDate.getMonth() - 2);

module.exports = function (config) {
  return listAllPoints(config)
    .then(filterStalePoints)
    .then((stalePoints) => {
      return Promise.all([
        deleteStalePoints(config, stalePoints),
        deleteStaleMaxPerimeters(config, stalePoints),
        deleteStalePerimeterDatasets(config, stalePoints),
      ]);
    });
};

function listAllPoints(config) {
  let allPoints = [];

  function listPointsPage(startId) {
    const options = {};
    if (startId) {
      options.start = startId;
    }
    return prudentMapboxClient(config.mapboxClient, 'listFeatures', [config.pointsDatasetId, options])
      .then((data) => {
        const points = data[0].features;
        if (points && points.length) {
          allPoints = allPoints.concat(points);
          const lastPointId = points[points.length - 1].id;
          return listPointsPage(lastPointId);
        }
      });
  }

  return listPointsPage().then(() => {
    return allPoints;
  });
}

function filterStalePoints(points) {
  return points.filter((point) => {
    const publishedDate = new Date(point.properties.published);
    return publishedDate < cutOffDate;
  });
}

function deleteStalePoints(config, stalePoints) {
  if (!stalePoints.length) {
    console.log('No stale points to delete');
    return Promise.resolve();
  }

  console.log('Deleting stale points from points dataset ...');
  const stalePointIds = stalePoints.map((point) => point.id);

  const deleteStalePointIds = stalePointIds.map((pointId) => {
    return prudentMapboxClient(config.mapboxClient, 'deleteFeature', [
      pointId,
      config.pointsDatasetId,
    ]);
  });

  return Promise.all(deleteStalePointIds).then(() => {
    console.log(chalk.green('Successfully deleted stale points from points dataset'));
  });
}

function deleteStaleMaxPerimeters(config, stalePoints) {
  if (!stalePoints.length) {
    console.log('No stale max perimeters to delete');
    return Promise.resolve();
  }

  console.log('Deleting stale max perimeters from max perimeters dataset ...');
  const stalePointInciwebids = stalePoints.map((point) => point.properties.inciwebid);
  const stalePerimeterIds = stalePointInciwebids.map((inciwebid) => `${inciwebid}-max-perimeter`);

  const deleteStalePerimeterIds = stalePerimeterIds.map((perimeterId) => {
    return prudentMapboxClient(config.mapboxClient, 'deleteFeature', [
      perimeterId,
      config.maxPerimetersDatasetId,
    ]);
  });

  return Promise.all(deleteStalePerimeterIds).then(() => {
    console.log(chalk.green('Successfully deleted stale max perimeters from max perimeters dataset'));
  });
}

function deleteStalePerimeterDatasets(config, stalePoints) {
  const stalePointInciwebids = stalePoints.map((point) => point.properties.inciwebid);
  const incwebidRegExpSegment = stalePointInciwebids.join('|');

  const targetedDatasetsRegExp = new RegExp(`${config.perimeterDatasetNamePrefix}(?:${incwebidRegExpSegment})-perimeters`);

  return listExistingDatasets(config).then((datasets) => {
    const targetedDatasets = datasets.filter((dataset) => {
      return targetedDatasetsRegExp.test(dataset.name);
    });

    console.log(`Deleting ${targetedDatasets.length} stale perimeter datasets ...`);

    return Promise.all(targetedDatasets.map(deleteDataset));
  });

  function deleteDataset(dataset) {
    return prudentMapboxClient(config.mapboxClient, 'deleteDataset', [dataset.id])
      .then(() => {
        console.log(chalk.green(`Successfully deleted stale dataset "${dataset.name}"`));
      })
      .catch(() => {
        console.log(chalk.red(`Failed to delete stale dataset "${dataset.name}"`));
      });
  }
}
