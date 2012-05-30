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
  const util = require('util');
  const crypto = require('crypto');
  const fs = require('fs');
  const path = require('path');
  const url = require('url');
  const zlib = require('zlib');

  // Npm.
  const knox = require('knox');
  const mime = require('mime');
  const async = require('async');
  const _ = require('underscore');
  const deferred = require('underscore.deferred');
  _.mixin(deferred);

  /**
   * Grunt aliases.
   */
  var log = grunt.log;

  /**
   * Success/error messages.
   */

  const MSG_UPLOAD_SUCCESS = '✓ Uploaded: %s (%s)';
  const MSG_DOWNLOAD_SUCCESS = '✓ Downloaded: %s (%s)';

  const MSG_ERR_NOT_FOUND = 'File not found: %s';
  const MSG_ERR_UPLOAD = 'Upload error: %s';
  const MSG_ERR_DOWNLOAD = 'Download error: %s';
  const MSG_ERR_CHECKSUM = 'Expected hash: %s but found %s';
  const MSG_ERR_VERIFY = 'Unable to verify upload: %s => %s';

  /**
   * Create an Error object based off of a formatted message. Arguments
   * are identical to those of util.format.
   *
   * @param {String} Format.
   * @param {...string|number} Values to insert into Format.
   */
  function makeError () {
    var msg = util.format.apply(util, _.toArray(arguments));
    return new Error(msg);
  }

  /**
   * Transfer files to/from s3.
   *
   * Uses global s3 grunt config.
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
   * Verifies that the upload was successful by comparing an md5 checksum of
   * the local and remote versions.
   *
   * @param {String} src The local path to the file to upload.
   * @param {String} dest The s3 path, relative to the bucket, to which the src is
   *     uploaded.
   * @param {Object} [options] An object containing options which override any option
   *     declared in the global s3 config.
   */
  grunt.registerHelper('s3.put', function (src, dest, options) {
    // Make sure the local file exists.
    if (!path.existsSync(src)) {
      return dfd.reject(makeError(MSG_ERR_NOT_FOUND, src));
    }

    var dfd = new _.Deferred();
    var config = _.defaults(options, grunt.config('s3') || {});
    var headers = options.headers || {};

    if (options.access) {
      headers['x-amz-acl'] = options.access;
    }

    // Pick out the configuration options we need for the client.
    var client = knox.createClient(_(config).pick([
      'endpoint', 'port', 'key', 'secret', 'access', 'bucket'
    ]));

    function upload(cb) {
      cb = cb || function () {};

      client.putFile(src, dest, headers, function (err, res) {
        // If there was an upload error any status other than a 200, we
        // can assume something went wrong.
        if (err || res.statusCode !== 200) {
          return dfd.reject(makeError(MSG_ERR_UPLOAD, err || res.statusCode));
        }

        fs.readFile(src, function (err, data) {
          if (err) {
            return dfd.reject(makeError(MSG_ERR_UPLOAD, err));
          }
          else {
            // The etag has double quotes around it. Strip them out.
            var remoteHash = res.headers.etag.replace(/"/g, '');

            // Get an md5 of the file so we can verify the uploads.
            var localHash = crypto.createHash('md5').update(data).digest('hex');

            if (remoteHash === localHash) {
              var msg = util.format(MSG_UPLOAD_SUCCESS, src, localHash);
              dfd.resolve(msg);
            }
            else {
              dfd.reject(makeError(MSG_ERR_CHECKSUM, localHash, remoteHash));
            }
          }

          cb(err);
        });
      });
    }

    // If gzip is enabled, gzip the file into a temp file and then perform the upload.
    if (options.gzip) {
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Type'] = mime.lookup(src);

      var tmp = src + '.gz';
      var incr = 0;
      while (path.existsSync(tmp)) {
        tmp = src + '.' + (incr++) + '.gz';
      }

      var input = fs.createReadStream(src);
      var output = fs.createWriteStream(tmp);

      input.pipe(zlib.createGzip()).pipe(output)
        .on('error', function (err) {
          dfd.reject(makeError(MSG_ERR_UPLOAD, err));
        })
        .on('close', function () {
          src = tmp;
          upload(function () {
            fs.unlinkSync(tmp);
          });
        });
    }
    else {
      upload();
    }

    return dfd;
  });

  /**
   * Download a file from s3.
   *
   * Verifies that the download was successful by downloading the file and
   * comparing an md5 checksum of the local and remote versions.
   *
   * @param {String} src The s3 path, relative to the bucket, of the file being
   *     downloaded.
   * @param {String} dest The local path where the download will be saved.
   * @param {Object} [options] An object containing options which override any option
   *     declared in the global s3 config.
   */
  grunt.registerHelper('s3.pull', function (src, dest, options) {
    var dfd = new _.Deferred();
    var config = _.defaults(options, grunt.config('s3') || {});

    // Create a local stream we can write the downloaded file to.
    var file = fs.createWriteStream(dest);

    // Pick out the configuration options we need for the client.
    var client = knox.createClient(_(config).pick([
      'endpoint', 'port', 'key', 'secret', 'access', 'bucket'
    ]));

    // Upload the file to this endpoint.
    client.getFile(src, function (err, res) {
      // If there was an upload error any status other than a 200, we
      // can assume something went wrong.
      if (err || res.statusCode !== 200) {
        return dfd.reject(makeError(MSG_ERR_DOWNLOAD, err || res.statusCode));
      }

      res
        .on('data', function (chunk) {
          file.write(chunk);
        })
        .on('error', function (err) {
          return dfd.reject(makeError(MSG_ERR_DOWNLOAD, err));
        })
        .on('end', function () {
          file.end();

          fs.readFile(dest, function (err, data) {
            if (err) {
              return dfd.reject(makeError(MSG_ERR_DOWNLOAD, err));
            }
            else {
              // The etag has double quotes around it. Strip them out.
              var remoteHash = res.headers.etag.replace(/"/g, '');
              var localHash = crypto.createHash('md5').update(data).digest('hex');

              if (remoteHash === localHash) {
                var msg = util.format(MSG_DOWNLOAD_SUCCESS, src, localHash);
                dfd.resolve(msg);
              }
              else {
                dfd.reject(makeError(MSG_ERR_CHECKSUM, localHash, remoteHash));
              }
            }
          });
        });
    });

    return dfd;
  });

};

