var async = require('async');
var grunt = require('grunt');
var s3 = require('../tasks/lib/s3').init(grunt);
var S3Task = require("../tasks/lib/S3Task");
var deferred = require('underscore.deferred');

var _ = grunt.util._;
_.mixin(deferred);

var s3Config = grunt.config("s3"),
    config = _.extend({}, s3Config.options, s3Config.test.options);

module.exports = {
  "run": function(test) {
  	var taskDef = new _.Deferred(),
  		asyncCalls = 0;
  	
  	// A fake grunt task
  	// TODO: Figure out if grunt has a way to mock this.
  	var mockTask = {
  		async: function() {
  			asyncCalls++;
  			return function(result) {
  				taskDef.resolve(result);
  			};
  		},
  		options: function(defaults) {
  			return _.defaults({}, s3Config.options, s3Config.test_S3Task.options, defaults);
  		},
  		data: s3Config.test_S3Task
  	};

  	// Remove the options from the data.
  	mockTask.data.options = null;

  	var task = new S3Task(mockTask, s3);

  	// Some vars to hold upload information
  	var uploadOrig = s3.upload,
  		uploadFiles = [],
  		uploadCalls = 0;

  	// Fake the upload functionality
  	s3.upload = function(file, dest, opts) {
  		uploadCalls++;

  		var def = new _.Deferred();

  		uploadFiles.push(dest);

  		setTimeout(function() { 
  			def.resolve();
  		}, 10);

  		return def.promise();
  	};

  	// Wait for the run() call to complete then test activity
  	taskDef.then(function(result) {
  			test.equal(asyncCalls, 1, "1 async() call");
  			test.equal(uploadFiles.length, 5, "5 uploaded files");
  			test.equal(uploadFiles[0], "a.txt", "Correct rel path on uploaded file 1");
  			test.equal(uploadFiles[4], "subdir/d.txt", "Correct rel path for subdir file");

  			test.ok(result, "Completed");
  		}, function(err) {
  			test.ok(false, "Completed");
  		})
  		.always(function() {
  			test.done();
  		});

  	task.run();
  },

  "_getConfig": function (test) {

  	// A fake grunt task
  	// TODO: Figure out if grunt has a way to mock this.
  	var mockTask = {
  		options: function(defaults) {
  			return _.defaults({}, s3Config.options, defaults);
  		},
  		data: {
  			upload: ["up1.txt", "up2.txt"],
  			del: ["del1.txt", "del2.txt"]
  		}
  	};

  	var oldVal = {
		key: process.env.AWS_ACCESS_KEY_ID,
		secret: process.env.AWS_SECRET_ACCESS_KEY
  	};

  	// Making sure we choose the options over the process key
  	process.env.AWS_ACCESS_KEY_ID = "testid";
  	process.env.AWS_SECRET_ACCESS_KEY = "secret";
    
    var task = new S3Task(mockTask);

    var config = task._getConfig();

    // Test the custom things first
    test.equal(config.key, s3Config.options.key, "Key");
	test.equal(config.secret, s3Config.options.secret, "Secret");
	test.equal(config.debug, false, "Debug");

	// Test the data actions
	test.equal(config.upload.length, 2, "Upload length");
	test.equal(config.upload[0], "up1.txt", "Upload file 1");
	test.equal(config.del.length, 2, "Del length");
	test.equal(config.del[0], "del1.txt", "Del file 1");

	// Testing things that are only in the default options.
	test.equal(config.bucket, s3Config.options.bucket, "Bucket");
	test.equal(config.endpoint, s3Config.options.endpoint, "Endpoint");

	// Be a good citizen and reset these.
	process.env.AWS_ACCESS_KEY_ID = oldVal.key;
  	process.env.AWS_SECRET_ACCESS_KEY = oldVal.secret;

	test.done();
  }
};