'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const initPreview = require('./initPreview');
const initDetail = require('./initDetail');
const Intro = require('./Intro');
const constants = require('./constants');

mapboxgl.accessToken = constants.MAPBOX_ACCESS_TOKEN;

const mapContainer = document.getElementById('map');
const introContainer = document.getElementById('intro');
const isSmallScreen = window.matchMedia('(max-width: 700px)').matches;
const isEmbedded = window.location.href.split('?')[1] && window.location.href.split('?')[1].indexOf('embed') !== -1;

const map = new mapboxgl.Map({
  container: mapContainer,
  style: 'mapbox://styles/davidtheclark/cit7gjb2n001a2wrymxzu5dd9?fresh=true',
  maxBounds: [-138, 21, -57, 51],
  center: (isSmallScreen)
    ? [-113.41187244951925, 45.2139740125572]
    : [-115.4722057096243, 40.89186465794805],
  zoom: constants.MIN_ZOOM,
  minZoom: constants.MIN_ZOOM, // minzoom at which data will appear
  maxZoom: constants.MAX_ZOOM,
  scrollZoom: !isEmbedded,
});
window.map = map;

map.dragRotate.disable();
map.touchZoomRotate.disableRotation();

if (!isSmallScreen) {
  map.addControl(new mapboxgl.Navigation({ position: 'bottom-left' }));
}

map.on('load', () => {
  initPreview(map);
  initDetail(map);
});

function closeIntro() {
  ReactDOM.unmountComponentAtNode(introContainer);
}

ReactDOM.render(<Intro onClose={closeIntro} />, introContainer);
