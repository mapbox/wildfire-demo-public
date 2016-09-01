'use strict';
/* eslint-disable no-console */

const retryRequest = require('./retryRequest');
const getRssItems = require('./getRssItems');
const queue = require('d3-queue').queue;

// Used for limiting only
const q = queue(20);

module.exports = function (inciwebid) {
  return getRawFeed(inciwebid)
    .then(getRssItems)
    .then((items) => {
      if (!items) return;
      return items.map(tidyItem);
    });
};

function tidyItem(rawItem) {
  return {
    title: rawItem.title[0],
    link: rawItem.link[0],
    description: rawItem.description[0],
    pubDate: rawItem.pubDate[0],
  };
}

function getRawFeed(inciwebid) {
  return new Promise((resolve, reject) => {
    console.log(`${inciwebid}: Fetching article feed`);
    const url = `http://inciweb.nwcg.gov/feeds/rss/articles/incident/${inciwebid}`;
    q.defer((done) => {
      retryRequest(url, (err, repsonse, body) => {
        done();
        if (err) return reject(err);
        resolve(body);
      });
    });
  });
}
