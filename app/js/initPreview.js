'use strict';

const escapeHtml = require('escape-html');
const constants = require('./constants');
const tidyTitle = require('./tidyTitle');

module.exports = function (map) {
  const canvas = map.getCanvasContainer();
  const previewEl = document.createElement('div');
  previewEl.className = 'preview round';

  function clearPreview() {
    if (previewEl.parentNode) {
      canvas.removeChild(previewEl);
    }
  }

  function createPreview(incidentPoint) {
    previewEl.innerHTML = `
      <span class="preview-title strong">
        ${escapeHtml(tidyTitle(incidentPoint.properties.title))}
      </span>
    `;
    canvas.appendChild(previewEl);
  }

  map.on('mousemove', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: [constants.LAYER_FIRE_POINTS],
    });

    if (features.length === 0) {
      canvas.style.cursor = '';
      clearPreview();
      return;
    }

    canvas.style.cursor = 'pointer';
    createPreview(features[0]);
  });
};
