'use strict';
/* eslint-disable no-console */

module.exports = function (client, method, args, callback) {
  let attempts = 1;
  attempt();

  function attempt() {
    attempts += 1;
    client[method].apply(client, args.concat(handleResponse));
  }

  function handleResponse(err) {
    if (err && attempts <= 3) {
      const message = err.message | '<no message>';
      console.log(`mapbox-sdk-js '${method}' error '${message}'-- retrying request`);
      return attempt();
    }

    if (err) {
      console.log(`mapbox-sdk-js '${method}' failure`);
    }

    callback.apply(null, arguments);
  }
};
