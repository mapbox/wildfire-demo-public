/* eslint-disable no-console */
'use strict';

const prudentRequest = require('./prudentRequest');
const parseRssFeed = require('./parseRssFeed');

const ARTICLE_FEED_URL_BASE = 'http://inciweb.nwcg.gov/feeds/rss/articles/incident/';

module.exports = function (apiEvent) {
  return getRawFeed(apiEvent.inciwebid)
    .then(parseRssFeed)
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
  const url = `${ARTICLE_FEED_URL_BASE}${inciwebid}`;
  return prudentRequest(url).then((data) => {
    return data.body;
  });
}
