
var crypto = require('crypto');
var fs = require('fs');
var grunt = require('grunt');

function hashFile(path) {
  return crypto.createHash('md5').update(fs.readFileSync(path)).digest("hex");
}

module.exports = {
  testPut : function (test) {
    test.expect(1);
    var src = __dirname + '/file.txt';
    var dest = __dirname + '/../s3/127/file.txt/.fakes3_metadataFFF/content';

    grunt.helper('s3.put', __dirname + '/file.txt', 'file.txt')
      .done(function () {
        test.ok(hashFile(src) === hashFile(dest), 'File uploaded successfully.');
        test.done();
      })
      .fail(function () {
        test.done();
      });
  }
};
