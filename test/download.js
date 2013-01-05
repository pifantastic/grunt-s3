
var grunt = require('grunt');
var hashFile = require('../tasks/lib/common').hashFile;
var s3 = require('../tasks/lib/s3').init(grunt);

module.exports = {
  testTask : function (test) {
    var config = s3.getConfig();
    test.expect(1);

    var dest = __dirname + '/files/a.txt';
    var src = __dirname + '/../s3/127/a.txt/.fakes3_metadataFFF/content';

    config.download = [{ src : 'a.txt', dest : dest }];
    s3.task(config, function (err, transfers) {
      test.ok(hashFile(src) === hashFile(dest), 'File downloaded successfully.');
      test.done();
    });
  }
};
