
var util = require('util');
var path = require('path');
var spawn = require('child_process').spawn;

var grunt = require('grunt');
var yaml = require('libyaml');
var wrench = require('wrench');
var _ = require('underscore');

var child;

exports.s3Path = function (file) {
  var _path = path.join(__dirname, '../s3/127', file, '.fakes3_metadataFFF');
  return {
    content : path.join(_path, 'content'),
    metadata : path.join(_path, 'metadata')
  };
};

exports.testPath = function (file) {
  return path.join(__dirname, 'files', file);
};

exports.yamlRead = function (file) {
  return yaml.parse(grunt.file.read(file));
};

exports.clean = function () {
  return wrench.rmdirSyncRecursive(path.join(__dirname, '../s3'), true);
};

exports.startServer = function (cb) {
  child = spawn('fakes3', ['-r', 's3', '-p', '1337']);

  // Yep, fakes3 outputs to stderr.
  child.stderr.once('data', function (data) {
    cb(null);
  });
};

exports.stopServer = function (cb) {
  if (child) {
    child.kill();
  }
  if (_(cb).isFunction()) {
    cb(null);
  }
};
