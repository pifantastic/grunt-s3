
var crypto = require('crypto');
var fs = require('fs');

/**
 * Get the md5 hash of a file.
 * @param  {String} path Path to file.
 * @return {String} md5 of file in hex format.
 */
exports.hashFile = function(path) {
  return crypto.createHash('md5').update(fs.readFileSync(path)).digest('hex');
}

/**
 * Clone an object.
 *
 * @returns {Object} A clone of the original object.
 */
exports.clone = function(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}
