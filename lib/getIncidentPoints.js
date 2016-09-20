/* eslint-disable no-console */
'use strict';

const chalk = require('chalk');
const _ = require('lodash');
const parseRssFeed = require('./parseRssFeed');
const prudentRequest = require('./prudentRequest');

const INCIDENTS_FEED_URL = 'http://inciweb.nwcg.gov/feeds/rss/incidents/';

// Within a single update there's no need to fetch and transform
// this data more than once, so memoizing
module.exports = _.memoize((config) => {
  console.log('Creating incident points ...');
  return prudentRequest(INCIDENTS_FEED_URL)
    .then((data) => {
      return parseRssFeed(data.body);
    }).then((incidents) => {
      if (!incidents || incidents.length === 0) {
        throw new Error('No incidents found');
      }
      console.log(chalk.green('Successfully created incident points'));
      return _.compact(incidents.map((rawIncident) => {
        return createIncidentPoint(config, rawIncident);
      }));
    });
});

function createIncidentPoint(config, rawIncident) {
  const incidentUrl = rawIncident.link[0];
  const inciwebid = String(incidentUrl.split('/').filter((x) => !!x).slice(-1));
  const incidentTitle = rawIncident.title[0];
  const legibleName = `"${incidentTitle}" (${inciwebid})`;
  const incidentCoordinates = [
    Number(rawIncident['geo:long'][0]),
    Number(rawIncident['geo:lat'][0]),
  ];

  if (isNaN(incidentCoordinates[0]) || isNaN(incidentCoordinates[1])) {
    console.log(chalk.yellow(`${inciwebid}: Bad coordinates for incident ${legibleName}`));
    return;
  }

  const incidentPoint = {
    type: 'Feature',
    id: `${inciwebid}-point`,
    properties: {
      inciwebid,
      title: incidentTitle,
      published: rawIncident.published[0],
      description: rawIncident.description ? rawIncident.description[0] : null,
      url: incidentUrl,
    },
    geometry: {
      type: 'Point',
      coordinates: incidentCoordinates,
    },
  };

  return incidentPoint;
}
