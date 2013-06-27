
var grunt = require('grunt');
var yaml = require('libyaml');
var hashFile = require('../tasks/lib/common').hashFile;
var s3 = require('../tasks/lib/s3').init(grunt);

var _ = grunt.util._;
var async = grunt.util.async;

var s3Config = grunt.config("s3"),
    config = _.extend({}, s3Config.options, s3Config.test.options);

module.exports = {
  testSync : function (test) {
    test.expect(2);

    async.waterfall([
      function (cb) {
        var src = __dirname + '/files/a.txt';
        var dest = __dirname + '/../s3/127/a.txt/.fakes3_metadataFFF/content';

        s3.sync(src, 'a.txt', config)
          .done(function () {
            test.ok(hashFile(src) === hashFile(dest), 'File uploaded successfully.');
          })
          .always(function () {
            cb(null);
          });
      },
      function (cb) {
        s3.sync('./src does not exist', './dest does not matter')
          .fail(function (err) {
            test.ok(err, 'Missing source results in an error.');
          })
          .always(function () {
            cb(null);
          });
      }
    ], function () {
      test.done();
    });
  }
};
