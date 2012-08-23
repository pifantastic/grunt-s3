module.exports = {
  setUp : function (callback) {
    console.log('setup');
    callback();
  },
  tearDown : function (callback) {
    console.log('tearDown');
    callback();
  },
  testPut : function (test) {
    test.expect(1);
    test.ok(true, 'this assertion should pass');
    test.done();
  }
};
