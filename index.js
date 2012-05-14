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

  /**
   * Module dependencies.
   */

  // Core.
  var util = require('util');
  var crypto = require('crypto');
  var fs = require('fs');
  var path = require('path');

  // Npm.
  var knox = require('knox');
  var async = require('async');

  /**
   * Grunt aliases.
   */
  var log = grunt.log;
  var _ = grunt.utils._;

  _.mixin(require('underscore.deferred'));

  /**
   * Success/error messages.
   */

  const MSG_SUCCESS = 'Uploaded: %s to: {%s}/%s (%s)';

  const MSG_ERR_NOT_FOUND = 'File not found: %s';
  const MSG_ERR_UPLOAD = 'Upload error: %s';
  const MSG_ERR_CHECKSUM = 'Expected remote hash: %s but found %s';
  const MSG_ERR_VERIFY = 'Unable to verify upload: %s => %s';

  /**
   * Create an Error object based off of a formatted message. Arguments
   * are identical to those of util.format.
   */
  function makeError () {
    var msg = util.format.apply( util, Array.prototype.slice.call(arguments, 0) );
    return new Error(msg);
  }

  /**
   * Make sure an object is in Array form.
   */
  function makeArray (thing) {
    return _.isArray(thing) ? thing : [thing];
  }

  /**
   * TODO: Create a generic task (probably a multiTask) that can upload/download
   * a collection of files to/from s3.
   */
  grunt.registerTask('s3', 'Publishes files to s3.', function () {

  });

  /**
   * Publishes the local file at src to the s3 dest.
   *
   * Verifies that the upload was successful by downloading the file and comparing
   * an md5 checksum of the local and remote versions.
   */
  grunt.registerHelper('s3.put', function (src, dest, headers) {
    var dfd = new _.Deferred();
    var config = grunt.config('s3');

    // We'll create a function to download/verify the file for each endpoint
    // that has been configured.
    var requests = [];

    var localHash = crypto.createHash('md5');
    var remoteHash;

    // Make sure the local file exists.
    if ( !path.existsSync(src) ) {
      return dfd.reject( makeError(MSG_ERR_NOT_FOUND, src) );
    }

    headers = headers || {};

    // Get an md5 of the file so we can verify the uploads.
    localHash = localHash.update( grunt.file.read(src, 'utf8') ).digest('hex');

    config.endpoints.forEach(function (endpoint) {
      requests.push(function (cb) {
        // Create a new s3 client using the current endpoint.
        var client = knox.createClient( _.extend({endpoint : endpoint}, config) );

        // Upload the file to this endpoint.
        client.putFile(src, dest, headers, function (err, res) {
          // If there was an upload error any status other than a 200, we
          // can assume something went wrong.
          if (err || res.statusCode !== 200) {
            return cb(makeError(MSG_ERR_UPLOAD, res.statusCode), null);
          }

          // The etag has double quotes around it. Strip them out.
          // NOTE: Currently, AmazonS3 returns the file's MD5 in the
          // ETag header. This could possibley change, but isn't likely.
          remoteHash = res.headers.etag.replace(/"/g, '');

          if (remoteHash === localHash) {
            log.ok('Verified local:' + localHash + ' ✓ s3:' + remoteHash);
            cb(null, endpoint);
          }
          else {
            cb(makeError(MSG_ERR_CHECKSUM, localHash, remoteHash), null);
          }
        });
      });
    });

    async.parallel(requests, function (err, res) {
      // A bug in async means err/res aren't always arrays.
      var result = err ? makeArray(err) : makeArray(res);

      if (err) {
        // Log all the errors we encountered and return the array of
        // errors.
        result.forEach(function (error) {
          log.error( error.toString() );
        });

        dfd.reject(result);
      }
      else {
        // Log a success message for each successful upload.
        result.forEach(function (endpoint) {
          log.ok( util.format('Uploaded: %s to: %s/%s', src, endpoint, dest) );
        });

        dfd.resolve(result);
      }
    });

    return dfd;
  });

  /**
   * Similar to s3.put but, you know, the other way.
   */
  grunt.registerHelper('s3.pull', function (src, dest) {

  });

  grunt.registerHelper('s3.putDir', function (src, dest) {
    var dfd = new _.Deferred();
    var requests = [];

    fs.readdir(src, function (err, files) {
      if (err) {
        dfd.reject(err);
      }
      else {
        files.forEach(function(file) {
          var fileSrc = path.join(src, file);
          var fileDest = path.join(dest, file);
          requests.push( grunt.helper('s3.put', fileSrc, fileDest) );
        });

        _.when.apply(null, requests)
        .done(function() {
          dfd.resolve();
        }).fail(function(err) {
          dfd.reject(err);
        });
      }
    });

    return dfd;
  });

};

