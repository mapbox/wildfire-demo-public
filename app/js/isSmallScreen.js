'use strict';

module.exports = function () {
  return window.matchMedia('(max-width: 700px)').matches;
};
