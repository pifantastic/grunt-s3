
var async = require('async');
var grunt = require('grunt');
var hashFile = require('../tasks/lib/common').hashFile;
var s3 = require('../tasks/lib/s3').init(grunt);

module.exports = {
  testPut : function (test) {
    test.expect(2);

    async.waterfall([
      function (cb) {
        var src = __dirname + '/files/a.txt';
        var dest = __dirname + '/../s3/127/a.txt/.fakes3_metadataFFF/content';

        s3.upload(src, 'a.txt')
          .done(function () {
            test.ok(hashFile(src) === hashFile(dest), 'File uploaded successfully.');
          })
          .always(function () {
            cb(null);
          });
      },
      function (cb) {
        s3.upload('./src does not exist', './dest does not matter')
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
  },

  testPutWithHeaders : function (test) {
    test.expect(1);

    async.waterfall([
      function (cb) {
        var src = __dirname + '/files/b.txt';
        var dest = __dirname + '/../s3/127/b.txt/.fakes3_metadataFFF/metadata';

        s3.upload(src, 'b.txt', { headers : {'Content-Type' : '<3'} })
          .always(function () {
            test.ok(grunt.file.read(dest).indexOf(':content_type: <3') !== -1, 'Headers are preserved.');
            cb(null);
          });
      }
    ], function () {
      test.done();
    });
  }
};
