'use strict';
/* eslint-disable no-console */

const request = require('request');

module.exports = function (url, callback) {
  tryRequest();

  let timeoutAttempts = 1;
  function tryRequest() {
    request(url, { timeout: 10000 }, (err, response, body) => {
      const timeoutError = err && (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT');
      if (err && err.code === 'ECONNRESET') {
        console.log(`ECONNRESET error -- retrying request to ${url}`);
        return tryRequest();
      }

      if (timeoutError) {
        timeoutAttempts += 1;
        console.log(`Timeout error -- retrying request to ${url}`);
      }

      if (timeoutError && timeoutAttempts <= 3) return tryRequest();
      if (timeoutError && timeoutAttempts > 3) {
        console.log(`Timeout failure -- You should try a manual call to ${url}`);
      }

      callback(err, response, body);
    });
  }
};