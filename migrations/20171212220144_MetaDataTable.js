exports.up = function(knex, Promise) {
    return knex.schema.createTable('meta', function (table) {
        table.string('name', 128).notNullable();
        table.string('value', 128).notNullable();
    }).then(() => {
        return knex('meta').insert({name: 'followedAccountsLastCheckedTimestamp', value: '0'})
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('meta');
};
