
var grunt = require('grunt');
var yaml = require('libyaml');
var hashFile = require('../tasks/lib/common').hashFile;
var s3 = require('../tasks/lib/s3').init(grunt);

module.exports = {
  task : {
    singleUpload : function (test) {
      var config = s3.getConfig();
      test.expect(1);

      var src = __dirname + '/files/a.txt';
      var dest = __dirname + '/../s3/127/a.txt/.fakes3_metadataFFF/content';

      config.upload = [{ src : 'test/files/a.txt', dest : 'a.txt' }];
      s3.task(config, function (err) {
        test.ok(hashFile(src) === hashFile(dest), 'File uploaded successfully.');
        test.done();
      });
    },

    wildcard : function (test) {
      var config = s3.getConfig();
      test.expect(1);

      config.upload = [{ src : 'test/files/*.txt', dest : 'files' }];
      s3.task(config, function (err, transfers) {
        test.ok(transfers === 2, 'Wildcard matches all files.');
        test.done();
      });
    }
  },

  testUpload : function (test) {
    test.expect(1);

    s3.upload('./src does not exist', './dest does not matter')
      .fail(function (err) {
        test.ok(err, 'Missing source results in an error.');
      })
      .always(function () {
        test.done();
      });
  },

  testUploadWithHeaders : function (test) {
    test.expect(1);

    var src = __dirname + '/files/b.txt';
    var dest = __dirname + '/../s3/127/b.txt/.fakes3_metadataFFF/metadata';

    s3.upload(src, 'b.txt', { headers : {'Content-Type' : '<3'} })
      .always(function () {
        var meta = yaml.parse(grunt.file.read(dest))
        test.ok(meta[0][':content_type'] === new Buffer('<3').toString('base64'), 'Headers are preserved.');
        test.done();
      });
  }
};
