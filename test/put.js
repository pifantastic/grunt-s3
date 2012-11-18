
var grunt = require('grunt');
var hashFile = require('../tasks/lib/common').hashFile;
var s3 = require('../tasks/lib/s3').init(grunt);

module.exports = {
  testPut : function (test) {
    test.expect(1);

    var src = __dirname + '/file.txt';
    var dest = __dirname + '/../s3/127/file.txt/.fakes3_metadataFFF/content';

    s3.upload(__dirname + '/file.txt', 'file.txt')
      .done(function () {
        test.ok(hashFile(src) === hashFile(dest), 'File uploaded successfully.');
        test.done();
      })
      .fail(function () {
        console.log(arguments);
        test.done();
      });
  }
};
