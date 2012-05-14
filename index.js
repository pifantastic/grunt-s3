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
  var url = require('url');

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

  const MSG_UPLOAD_SUCCESS = '✓ Uploaded: %s (%s)';
  const MSG_DOWNLOAD_SUCCESS = '✓ Downloaded: %s (%s)';

  const MSG_ERR_NOT_FOUND = 'File not found: %s';
  const MSG_ERR_UPLOAD = 'Upload error: %s';
  const MSG_ERR_DOWNLOAD = 'Download error: %s';
  const MSG_ERR_CHECKSUM = 'Expected remote hash: %s but found %s';
  const MSG_ERR_VERIFY = 'Unable to verify upload: %s => %s';

  /**
   * Create an Error object based off of a formatted message. Arguments
   * are identical to those of util.format.
   */
  function makeError () {
    var msg = util.format.apply(util, _.toArray(arguments));
    return new Error(msg);
  }

  /**
   * Transfer files to/from s3.
   */
  grunt.registerTask('s3', 'Publishes files to s3.', function () {
    var done = this.async();
    var config = _.defaults(grunt.config('s3') || {}, {
      upload: [],
      download: []
    });

    var transfers = [];

    config.upload.forEach(function(upload) {
      // Expand list of files to download.
      var files = grunt.file.expandFiles(upload.src);

      files.forEach(function(file) {
        // If there is only 1 file and it matches the original file wildcard,
        // we know this is a single file transfer. Otherwise, we need to build
        // the destination.
        var dest = (files.length === 1 && file === upload.src)
          ? upload.dest
          : path.join(upload.dest, path.basename(file));

        transfers.push(grunt.helper('s3.put', file, dest, upload));
      });
    });

    config.download.forEach(function(download) {
      transfers.push(grunt.helper('s3.pull', download.src, download.dest, download));
    });

    var total = transfers.length;
    var errors = 0;

    transfers.forEach(function(transfer) {
      transfer.done(function(msg) {
        log.ok(msg);
      });

      transfer.fail(function(msg) {
        log.error(msg);
        ++errors;
      });

      transfer.always(function() {
        if (--total === 0) {
          done(!errors);
        }
      });
    });
  });

  /**
   * Publishes the local file at src to the s3 dest.
   *
   * Verifies that the upload was successful by downloading the file and comparing
   * an md5 checksum of the local and remote versions.
   */
  grunt.registerHelper('s3.put', function (src, dest, options) {
    var dfd = new _.Deferred();
    var config = _.defaults(options, grunt.config('s3') || {});

    var headers = options.headers || {};

    var localHash = crypto.createHash('md5');
    var remoteHash;

    if (options.access) {
      headers['x-amz-acl'] = options.access;
    }

    // Make sure the local file exists.
    if (!path.existsSync(src)) {
      return dfd.reject(makeError(MSG_ERR_NOT_FOUND, src));
    }

    // Get an md5 of the file so we can verify the uploads.
    localHash = localHash.update(grunt.file.read(src)).digest('hex');

    // Create a new s3 client using the current endpoint.
    var client = knox.createClient(config);

    // Upload the file to this endpoint.
    client.putFile(src, dest, headers, function (err, res) {
      // If there was an upload error any status other than a 200, we
      // can assume something went wrong.
      if (err || res.statusCode !== 200) {
        return dfd.reject(makeError(MSG_ERR_UPLOAD, res.statusCode));
      }

      // The etag has double quotes around it. Strip them out.
      remoteHash = res.headers.etag.replace(/"/g, '');

      if (remoteHash === localHash) {
        var msg = util.format(MSG_UPLOAD_SUCCESS, src, localHash);
        dfd.resolve(msg);
      }
      else {
        dfd.reject(makeError(MSG_ERR_CHECKSUM, localHash, remoteHash));
      }
    });

    return dfd;
  });

  /**
   * Similar to s3.put but, you know, the other way.
   */
  grunt.registerHelper('s3.pull', function (src, dest, options) {
    var dfd = new _.Deferred();

    var config = _.defaults(options, grunt.config('s3') || {});

    // Create a local stream we can write the downloaded file to.
    var file = fs.createWriteStream(dest);

    // We'll want to verify the download once it's finished.
    var localHash = crypto.createHash('md5');

    // Create a new s3 client using the current endpoint.
    var client = knox.createClient(config);

    // Upload the file to this endpoint.
    client.getFile(src, function (err, res) {

      // If there was an upload error any status other than a 200, we
      // can assume something went wrong.
      if (err || res.statusCode !== 200) {
        return dfd.reject(makeError(MSG_ERR_DOWNLOAD, res.statusCode));
      }

      res
        .on('data', function (chunk) {
          file.write(chunk);
        })
        .on('end', function () {
          file.end();

          // The etag has double quotes around it. Strip them out.
          var remoteHash = res.headers.etag.replace(/"/g, '');
          localHash = localHash.update(grunt.file.read(dest)).digest('hex');

          if (remoteHash === localHash) {
            var msg = util.format(MSG_DOWNLOAD_SUCCESS, src, localHash);
            dfd.resolve(msg);
          }
          else {
            dfd.reject(makeError(MSG_ERR_CHECKSUM, localHash, remoteHash));
          }
        });
    });

    return dfd;
  });

};

