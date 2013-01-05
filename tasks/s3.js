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
    var config = s3.getConfig();

    s3.task(config, function (err) {
      done(!err);
    });
  });

};

