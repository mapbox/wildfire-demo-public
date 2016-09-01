'use strict';

module.exports = function (title) {
  return title.trim().replace(/(?:Fire\s*)?\(.*\)$/, '') + ' Fire';
};
