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

  const s3 = require('./lib/s3').init(grunt);
  const S3Task = require("./lib/S3Task");

  /**
   * Transfer files to/from s3.
   *
   * Uses global s3 grunt config.
   */
  grunt.registerMultiTask('s3', 'Publishes files to s3.', function () {
    var task = new S3Task(this, s3);

    task.run();
  });
};
