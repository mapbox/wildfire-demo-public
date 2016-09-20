'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const constants = require('./constants');
const Detail = require('./Detail');

const detailEl = document.getElementById('detail');

module.exports = function (map) {
  let detailIsActive = false;

  function createDetail(feature) {
    detailIsActive = true;
    detailEl.classList.remove('is-hidden');
    ReactDOM.render(<Detail
      firePoint={feature}
      map={map}
      onClose={destroyDetail} />, detailEl);
  }

  function destroyDetail(callback) {
    if (!detailIsActive) {
      if (typeof callback === 'function') callback();
      return;
    }

    detailEl.classList.add('is-hidden');

    if (!callback) {
      map.zoomTo(constants.MIN_ZOOM);
    }

    setTimeout(() => {
      detailIsActive = false;
      ReactDOM.unmountComponentAtNode(detailEl);
      if (typeof callback === 'function') callback();
    }, 300);
  }

  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: [constants.LAYER_FIRE_POINTS],
    });

    if (features.length === 0) return destroyDetail();

    e.originalEvent && e.originalEvent.preventDefault();
    e.originalEvent && e.originalEvent.stopPropagation();

    destroyDetail(() => {
      createDetail(features[0]);
    });
  });
};
