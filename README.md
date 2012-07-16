# Grunt + Amazon S3

## About

Amazon S3 is a great tool for storing/serving data. Thus, there is a chance it is part of your build
process. This task can help you automate uploading/downloading files to/from Amazon S3. All file
transfers are verified and will produce errors if incomplete.

## Dependencies

* knox
* mime
* async
* underscore
* underscore.deferred

## Installation

1. `npm install grunt-s3`
2. Add `grunt.loadNpmTasks('grunt-s3');` to your project's `grunt.js` file.

## Configuration

* **key** - (*string*) An Amazon S3 credentials key
* **secret** - (*string*) An Amazon S3 credentials secret
* **bucket** - (*string*) An Amazon S3 bucket
* **headers** - (*object*) An object containing any headers you would like to send along with the
transfers i.e. `{ 'X-Awesomeness': 'Out-Of-This-World', 'X-Stuff': 'And Things!' }`
* **access** - (*string*) A specific Amazon S3 ACL. Available values: `private`, `public-read`, `
public-read-write`, `authenticated-read`, `bucket-owner-read`, `bucket-owner-full-control`
* **gzip** - (*boolean*) If true, uploads will be gzip-encoded.
* **upload** - (*array*) An array of objects, each object representing a file upload and containing a `src`
and a `dest`. Any of the above values may also be overriden.
* **download** - (*array*) An array of objects, each object representing a file download and containing a
`src` and a `dest`. Any of the above values may also be overriden.
* **del** - (*array*) An array of objects, each object containing a `src` to delete from s3. Any of
the above values may also be overriden.

### Example

```javascript
grunt.initConfig({

  s3: {
    key: 'YOUR KEY',
    secret: 'YOUR SECRET',
    bucket: 'my-bucket',
    access: 'public-read',

    // Files to be uploaded.
    upload: [
      {
        src: 'important_document.txt',
        dest: 'documents/important.txt',
        gzip: true
      },
      {
        src: 'passwords.txt',
        dest: 'documents/ignore.txt',

        // These values will override the above settings.
        bucket: 'some-specific-bucket',
        access: 'authenticated-read'
      },
      {
        // Wildcards are valid *for uploads only* until I figure out a good implementation
        // for downloads.
        src: 'documents/*.txt',

        // But if you use wildcards, make sure your destination is a directory.
        dest: 'documents/'
      }
    ],

    // Files to be downloaded.
    download: [
      {
        src: 'documents/important.txt',
        dest: 'important_document_download.txt'
      },
      {
        src: 'garbage/IGNORE.txt',
        dest: 'passwords_download.txt'
      }
    ],

    del: [
      {
        src: 'documents/launch_codes.txt'
      },
      {
        src: 'documents/backup_plan.txt'
      }
    ]
  }

});
```

Running `grunt s3` using the above config produces the following output:

    $ grunt s3
    Running "s3" task
    >> ↙ Downloaded: documents/important.txt (e704f1f4bec2d17f09a0e08fecc6cada)
    >> ↙ Downloaded: garbage/IGNORE.txt (04f7cb4c893b2700e4fa8787769508e8)
    >> ↗ Uploaded: documents/document1.txt (04f7cb4c893b2700e4fa8787769508e8)
    >> ↗ Uploaded: passwords.txt (04f7cb4c893b2700e4fa8787769508e8)
    >> ↗ Uploaded: important_document.txt (e704f1f4bec2d17f09a0e08fecc6cada)
    >> ↗ Uploaded: documents/document2.txt (04f7cb4c893b2700e4fa8787769508e8)
    >> ✗ Deleted: documents/launch_codes.txt
    >> ✗ Deleted: documents/backup_plan.txt
    Done, without errors.

### Alternative ways of including your s3 configuration

#### Grunt template strings

(Special thanks to @nanek)

Template strings in grunt will allow you to easily include values from other files. The below example
demonstrates loading aws settings from another file.

```javascript
grunt.initConfig({
  aws: '<json:grunt-aws.json>',
  s3: {
    key: '<%= aws.key %>',
    secret: '<%= aws.secret %>',
    bucket: '<%= aws.bucket %>',
    access: 'public-read'
  }
}
```

Where grunt-aws.json is just a json key:value file like package.json.

#### Environment variables

If you do not pass in a **key** and **secret** with your config, `grunt-s3` will fallback to the following
environment variables:

* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`

## Helpers

### grunt.helper('s3.put', src, dest, options)

Upload a file to s3. Returns a Promises/J-style Deferred object.

**src** (required) - The path to the file to be uploaded. Accepts wildcards, i.e. `files/*.txt`

**dest** (required) - The path on s3 where the file will be uploaded, relative to the bucket. If you use a
wildcard for **src**, this should be a directory.

**options** (optional) - An object containing any of the following values. These values override
any values specified in the main config.

* **key** - An Amazon S3 credentials key
* **secret** - An Amazon S3 credentials secret
* **bucket** - An Amazon S3 bucket
* **headers** - An object containing any headers you would like to send along with the upload.
* **access** - A specific Amazon S3 ACL. Available values: `private`, `public-read`, `public-read-write`,
`authenticated-read`, `bucket-owner-read`, `bucket-owner-full-control`
* **gzip** - (*boolean*) If true, uploads will be gzip-encoded.

### grunt.helper('s3.pull', src, dest, options)

Download a file from s3. Returns a Promises/J-style Deferred object.

**src** (required) - The path on S3 from which the file will be downloaded, relative to the bucket. **Does not accept wildcards**

**dest** (required) - The local path where the file will be saved.

**options** (optional) - An object containing any of the following values. These values override
any values specified in the main config.

* **key** - An Amazon S3 credentials key
* **secret** - An Amazon S3 credentials secret
* **bucket** - An Amazon S3 bucket
* **headers** - An object containing any headers you would like to send along with the upload.

### grunt.helper('s3.delete', src, options)

Delete a file from s3. Returns a Promises/J-style Deferred object.

**src** (required) - The path on S3 of the file to delete, relative to the bucket. **Does not accept wildcards**

**options** (optional) - An object containing any of the following values. These values override
any values specified in the main config.

* **key** - An Amazon S3 credentials key
* **secret** - An Amazon S3 credentials secret
* **bucket** - An Amazon S3 bucket
* **headers** - An object containing any headers you would like to send along with the upload.

### Examples

```javascript
var upload = grunt.helper('s3.put', 'dist/my-app-1.0.0.tar.gz', 'archive/my-app-1.0.0.tar.gz');

upload
  .done(function(msg) {
    console.log(msg);
  })
  .fail(function(err) {
    console.log(err);
  })
  .always(function() {
    console.log('dance!');
  });

var download = grunt.helper('s3.pull', 'dist/my-app-0.9.9.tar.gz', 'local/my-app-0.9.9.tar.gz');

download.done(function() {
  grunt.helper('s3.delete', 'dist/my-app-0.9.9.tar.gz');
});

```

## Changelog

#### v0.0.6

* Bump version of `underscore.deferred` to `0.1.4`. Version `0.1.3` would fail to install sometimes
due to there being two versions of the module with different capitalizations in npm.
