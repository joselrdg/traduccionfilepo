const fs = require("fs");

function pathExists(path) {
  return fs.existsSync(path);
}

function createDirectory(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, 0777);
  }
}

module.exports = { pathExists, createDirectory };
