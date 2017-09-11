// Update with your config settings.

module.exports = {
  client: 'sqlite3',
  connection: {
    filename: "./sqlite.db"
  },
  migrations: {
    tableName: 'migrations'
  }
};