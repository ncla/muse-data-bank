To run latest database migrations:

`./node_modules/knex/bin/cli.js migrate:latest`

To refresh the whole thing from start, add `rm sqlite.db` before it to delete database.

To install on Windows 10 bash, you need to `npm install -g node-pre-gyp`, and run the install like this:

`rm ./node_modules/* -rf && yarn cache clean && yarn install`

Additionally you can try `-no-bin-links` flag for `yarn install`. If after one hour of trying nothing works, install a distro natively on your PC and screw fucking around with Symbolic Links on W10 Bash.

You will need `composer` to install PHP dependencies for Instagram tracking.