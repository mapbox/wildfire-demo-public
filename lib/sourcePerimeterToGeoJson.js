'use strict';

const arcgisToGeoJSON = require('arcgis-to-geojson-utils').arcgisToGeoJSON;
const simplify = require('@turf/simplify');

const SIMPLIFICATION_TOLERANCE = 0.00005;

module.exports = function (sourcePerimeter) {
  if (!sourcePerimeter) return;

  const geoJsonGeometry = arcgisToGeoJSON(sourcePerimeter.geometry);
  const geoJson = {
    type: 'Feature',
    properties: sourcePerimeter.attributes,
    geometry: geoJsonGeometry,
  };

  return simplify(geoJson, SIMPLIFICATION_TOLERANCE, true);
};
