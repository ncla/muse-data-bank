> [!NOTE]  
> This project is currently being rewritten to TypeScript with tests in Jest in repository [here](https://github.com/ncla/muse-discord-updates-bot-ts). While the code published here still works and publishes notifications to Discord channel, this was written in 2017 and I am not happy anymore with some of the code here.

To run latest database migrations:

`./node_modules/knex/bin/cli.js migrate:latest`

To refresh the whole thing from start, just run `rm sqlite.db` and run migrations again.
