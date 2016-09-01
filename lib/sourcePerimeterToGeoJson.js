'use strict';

const arcgisToGeoJSON = require('arcgis-to-geojson-utils').arcgisToGeoJSON;

module.exports = function (inciwebid, sourcePerimeter) {
  if (!sourcePerimeter) return;

  const geoJsonGeometry = arcgisToGeoJSON(sourcePerimeter.geometry);
  const perimeterId = `${inciwebid}-perimeter`;
  const geoJson = {
    type: 'Feature',
    id: perimeterId,
    properties: sourcePerimeter.attributes,
    geometry: geoJsonGeometry,
  };

  return geoJson;
};
