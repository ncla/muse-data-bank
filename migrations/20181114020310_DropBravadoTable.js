exports.up = function(knex, Promise) {
    return knex.schema.dropTableIfExists('shop_bravadousa')
};

exports.down = function(knex, Promise) {
    return knex.schema.createTable('shop_bravadousa', function (table) {
        table.increments();
        table.string('entry_id', 128).notNullable();
        table.string('entry_text', 256);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.unique(['entry_id']);
    })
};