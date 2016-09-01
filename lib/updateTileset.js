'use strict';

/* eslint-disable no-console */
let uploadId;

module.exports = function (config) {
  return createUpload()
    .catch((err) => {
      console.error(err);
    });

  function createUpload() {
    return new Promise((resolve, reject) => {
      console.log('>> Sending tileset upload');
      config.mapboxClient.createUpload({
        tileset: `${config.ownerId}.${config.datasetId}`,
        name: 'fires',
        url: `mapbox://datasets/${config.ownerId}/${config.datasetId}`,
      }, (err, upload) => {
        if (err) return reject(new Error(err.message));
        uploadId = upload.id;
        console.log(`Upload id: ${uploadId}`);
        resolve();
      });
    });
  }
};
