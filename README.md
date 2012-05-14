# Grunt + Amazon S3

### About

Amazon S3 is a great tool for storing/serving data. Thus, there is a chance it is part of your build process. This task can help you automate uploading/downloading files to/from Amazon S3. All file transfers are verified and will produce errors if incomplete.

### Dependencies

* knox
* async
* underscore.deferred

### Configuration

Here is an example grunt.js configuration showing you all possible configuration.

    grunt.initConfig({

      s3: {
        key: 'YOUR KEY',
        secret: 'YOUR SECRET',
        bucket: 'my-bucket',

        // Available values:
        // private | public-read | public-read-write | authenticated-read | bucket-owner-read | bucket-owner-full-control
        access: 'public-read',

        // Files to be uploaded.
        upload: [
          {
            src: 'important_document.txt',
            dest: 'documents/important.txt'
          },
          {
            src: 'passwords.txt',
            dest: 'documents/ignore.txt',

            // These values will override the above settings.
            bucket: 'some-specific-bucket',
            access: 'authenticated-read'
          },
          {
            // Wildcards are valid.
            src: 'documents/*.txt',

            // But if you use wildcards, make sure your destination is a directory.
            dest: 'documents/'
          }
        ],

        // Files to be downloaded.
        download: [
          {
            src: 'report.pdf',
            dest: 'Reports/report.pdf'
          },
          {
            bucket: 'my-super-secret-bucket',
            src: 'battle_plan.txt',
            dest: '/tmp/battle_plan.txt'
          }
        ]
      }

    });

Running `grunt s3` using the above config produces the following output:

    $ grunt s3
    Running "s3" task
    >> ✓ Downloaded: documents/important.txt (e704f1f4bec2d17f09a0e08fecc6cada)
    >> ✓ Downloaded: garbage/IGNORE.txt (04f7cb4c893b2700e4fa8787769508e8)
    >> ✓ Uploaded: documents/document1.txt (04f7cb4c893b2700e4fa8787769508e8)
    >> ✓ Uploaded: passwords.txt (04f7cb4c893b2700e4fa8787769508e8)
    >> ✓ Uploaded: important_document.txt (e704f1f4bec2d17f09a0e08fecc6cada)
    >> ✓ Uploaded: documents/document2.txt (04f7cb4c893b2700e4fa8787769508e8)

    Done, without errors.
