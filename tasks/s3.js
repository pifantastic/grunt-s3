/*jshint esnext:true*/
/*globals module:true, require:true, process:true*/

/*
 * Grunt Task File
 * ---------------
 *
 * Task: S3
 * Description: Move files to and from s3
 * Dependencies: knox, async, underscore.deferred
 *
 */

module.exports = function (grunt) {

  const _ = require('underscore');
  const path = require('path');
  const s3 = require('./lib/s3').init(grunt);

  /**
   * Grunt aliases.
   */
  const log = grunt.log;

  /**
   * Transfer files to/from s3.
   *
   * Uses global s3 grunt config.
   */
  grunt.registerTask('s3', 'Publishes files to s3.', function () {
    var done = this.async();
    var config = _.defaults(s3.getConfig(), {
      upload: [],
      download: [],
      del: [],
      copy: []
    });

    var transfers = [];

    config.upload.forEach(function(upload) {
      // Expand list of files to upload.
      var files = grunt.file.expandFiles(upload.src),
          destPath = grunt.template.process(upload.dest);

      files.forEach(function(file) {
        file = path.resolve(file);
        upload.src = path.resolve(grunt.template.process(upload.src));

        // If there is only 1 file and it matches the original file wildcard,
        // we know this is a single file transfer. Otherwise, we need to build
        // the destination.
        var dest;
        if (files.length === 1 && file === upload.src) {
          dest = destPath;
        }
        else {
          if (upload.rel) {
            dest = path.join(destPath, path.relative(grunt.file.expandDirs(upload.rel)[0], file));
          }
          else {
            dest = path.join(destPath, path.basename(file));
          }
        }

        transfers.push(s3.upload(file, dest, upload));
      });
    });

    config.download.forEach(function(download) {
      transfers.push(s3.download(download.src, download.dest, download));
    });

    config.del.forEach(function(del) {
      transfers.push(s3.del(del.src, del));
    });

    config.copy.forEach(function(copy) {
      transfers.push(s3.copy(copy.src, copy.dest, copy));
    });

    var total = transfers.length;
    var errors = 0;

    // Keep a running total of errors/completions as the transfers complete.
    transfers.forEach(function(transfer) {
      transfer.done(function(msg) {
        log.ok(msg);
      });

      transfer.fail(function(msg) {
        log.error(msg);
        ++errors;
      });

      transfer.always(function() {
        // If this was the last transfer to complete, we're all done.
        if (--total === 0) {
          done(!errors);
        }
      });
    });
  });

};

