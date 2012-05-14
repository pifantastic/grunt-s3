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
            dest: 'documents/important.txt',
          },
          {
            src: 'passwords.txt',
            dest: 'garbage/IGNORE.txt',

            // These values will override the above settings.
            bucket: 'some-specific-bucket',
            access: 'authenticated-read'
          },
          {
            // Wildcards are valid.
            src: 'test/*.txt',

            // But if you use wildcards, make sure your destination is a directory.
            dest: 'test/'
          }
        ],

        // Files to be downloaded.
        download: [
          {
            src: 'report.pdf',
            dest: '/Reports/report.pdf'
          },
          {
            bucket: 'my-super-secret-bucket',
            src: 'battle_plan.txt',
            dest: '/tmp/battle_plan.txt'
          },
          {
            src: 'reports/*.pdf',
            dest: '/Reports'
          }
        ]
      }

    });
