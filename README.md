**Note**: this project has shit code, I only care that it just works for r/Muse Discord server needs, that is all.

To run latest database migrations:

`./node_modules/knex/bin/cli.js migrate:latest`

To refresh the whole thing from start, just run `rm sqlite.db` and run migrations again.