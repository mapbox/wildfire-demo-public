/* eslint-disable no-console */
'use strict';

const request = require('request');
const queue = require('d3-queue').queue;

const TIMEOUT_RETRY_LIMIT = 3;
const requestQueue = queue(20);

// Automatically throttles and retries on timeouts
module.exports = function (url) {
  return new Promise((resolve, reject) => {
    let timeoutAttempts = 0;
    attempt();

    function attempt() {
      requestQueue.defer((enableNextRequest) => {
        request(url, { timeout: 10000 }, (err, response, body) => {
          enableNextRequest();

          if (err && err.code === 'ECONNRESET') {
            return attempt();
          }

          const timeoutError = err && (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT');

          if (err && !timeoutError) {
            return reject(err);
          }

          if (timeoutError && timeoutAttempts < TIMEOUT_RETRY_LIMIT) {
            timeoutAttempts += 1;
            return attempt();
          }

          if (timeoutError && timeoutAttempts >= TIMEOUT_RETRY_LIMIT) {
            console.log(`Timeout failure -- You should try a manual call to ${url}`);
          }

          resolve({ response, body });
        });
      });
    }
  });
};
