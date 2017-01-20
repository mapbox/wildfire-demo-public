/* eslint-disable no-console */
'use strict';

const queue = require('d3-queue').queue;

const RETRY_LIMIT = 3;
const requestQueue = queue(20);

// Automatically throttles and retries
module.exports = function (client, method, args) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    attempt();

    function attempt() {
      attempts += 1;
      requestQueue.defer((allowNextRequest) => {
        client[method].apply(client, args.concat(handleResponse));

        function handleResponse(err) {
          allowNextRequest();

          if (err && attempts < RETRY_LIMIT) {
            return attempt();
          }

          if (err) {
            const message = err.message || '<no message>';
            console.log(`Failed with args: ${JSON.stringify(args)}`);
            return reject(new Error(`mapbox-sdk-js "${method}" failed: ${message}`));
          }

          resolve(Array.from(arguments).slice(1));
        }
      });
    }
  });
};
