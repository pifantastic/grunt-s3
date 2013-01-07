
var Tempfile = require('temporary/lib/file');
var grunt = require('grunt');
var hashFile = require('../tasks/lib/common').hashFile;
var s3 = require('../tasks/lib/s3').init(grunt);
var helpers = require('./helpers');

module.exports = {

  main : {

    testTask : {

      singleDownload : function (test) {
        var config = s3.getConfig();
        test.expect(1);

        var dest = new Tempfile();
        var src = helpers.s3Path('a.txt');

        config.download = [{ src : 'a.txt', dest : dest.path }];
        s3.task(config, function (err, transfers) {
          test.ok(hashFile(src.content) === hashFile(dest.path), 'File downloaded successfully.');
          test.done();
        });
      }

    }

  },

  tearDown : function (cb) {
    helpers.clean();
    helpers.stopServer(cb);
  }
};
