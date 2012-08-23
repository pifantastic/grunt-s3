module.exports = function(grunt) {
  grunt.initConfig({
    test: {
      all: ['test/**/*.js']
    }
  });

  grunt.loadTasks(__dirname + '/tasks');
};
