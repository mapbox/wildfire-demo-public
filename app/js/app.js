'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const initPreview = require('./initPreview');
const initDetail = require('./initDetail');
const Intro = require('./Intro');

mapboxgl.accessToken = 'pk.eyJ1IjoiZGF2aWR0aGVjbGFyayIsImEiOiJjaW93emVwanowMW5ldGhtNGI2N293eDY3In0.-hV-UWrYPEZWbILtCFFbOg';

const mapContainer = document.getElementById('map');
const introContainer = document.getElementById('intro');
const isSmallScreen = window.matchMedia('(max-width: 700px)').matches;
const isEmbedded = window.location.href.split('?')[1] && window.location.href.split('?')[1].indexOf('embed') !== -1;

const map = new mapboxgl.Map({
  container: mapContainer,
  style: 'mapbox://styles/davidtheclark/cis3yanli000kgnkonqhnl9ts?fresh=true',
  maxBounds: [-171, 21, -57, 72],
  center: (isSmallScreen)
    ? [-113.41187244951925, 45.2139740125572]
    : [-115.4722057096243, 40.89186465794805],
  zoom: 5,
  minZoom: 5, // minzoom at which data will appear
  maxZoom: 12.5,
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
