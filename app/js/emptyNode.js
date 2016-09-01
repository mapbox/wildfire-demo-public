'use strict';

module.exports = function (node) {
  while (node.hasChildNodes()) {
    node.removeChild(node.lastChild);
  }
};
