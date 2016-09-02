'use strict';

module.exports = function (title) {
  return title.trim().replace(/(?:[fF]ire\s*)?\(.*\)$/, '') + ' Fire';
};
