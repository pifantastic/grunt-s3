/*jshint esnext:true*/
/*globals module:true, require:true, process:true*/

/*
 * Grunt Task File
 * ---------------
 *
 * Task: S3
 * Description: Move files to and from s3
 * Dependencies: knox, underscore.deferred
 *
 */

module.exports = function (grunt) {

  const path = require('path');
  const s3 = require('./lib/s3').init(grunt);

  /**
   * Grunt aliases.
   */
  const _ = grunt.util._;
  const async = grunt.util.async;
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

    if (config.debug) {
      log.writeln("Running in debug mode, no transfers will be made".yellow);
      log.writeln();
    }

    config.upload.forEach(function(upload) {
      // Expand list of files to upload.
      var files = grunt.file.expand({ filter: "isFile" }, upload.src),
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
            dest = path.join(destPath, path.relative(grunt.file.expand({ filter: "isDirectory" }, upload.rel)[0], file));
          }
          else {
            dest = path.join(destPath, path.basename(file));
          }
        }
        if(config.encodePaths === true) dest = encodeURIComponent(dest)

        transfers.push(s3.upload.bind(s3,file, dest, upload));
      });
    });

    config.download.forEach(function(download) {
      transfers.push(s3.download.bind(s3,download.src, download.dest, download));
    });

    config.del.forEach(function(del) {
      transfers.push(s3.del.bind(s3,del.src, del));
    });

    config.copy.forEach(function(copy) {
      transfers.push(s3.copy.bind(s3,copy.src, copy.dest, copy));
    });

    var errors = 0;

    var eachTransfer = config.maxOperations > 0
      ? async.forEachLimit.bind(async,transfers,config.maxOperations)
      : async.forEach.bind(async,transfers)
    
    eachTransfer(function(transferFn,completed){
      var transfer = transferFn()
      
      transfer.done(function(msg) {
        log.ok(msg);
        completed()
      })
      
      transfer.fail(function(msg) {
        log.error(msg);
        ++errors;
        completed()
      })
      
    },function(){
      // we're all done.
      done(!errors);
    })
  });
};
