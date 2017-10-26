exports.up = function(knex, Promise) {
    return knex.schema.createTable('dime', function (table) {
        table.increments();
        table.string('entry_id', 32).notNullable();
        table.string('entry_text', 512);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.unique(['entry_id']);
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('dime');
};
