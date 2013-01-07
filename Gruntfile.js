
module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      src: ['tasks/**/*.js'],
      test: ['test/**/*.js']
    },
    nodeunit: {
      all: ['test/upload.js', 'test/download.js']
    },
    s3: {
      key: 'abc',
      secret: 'def',
      bucket: 'test',
      endpoint: '127.0.0.1',
      port: 1337,
      secure: false,
      access: 'public-read'
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.registerTask('test', ['nodeunit']);
  grunt.registerTask('default', ['jshint', 'nodeunit']);
  grunt.loadTasks(__dirname + '/tasks');
};
