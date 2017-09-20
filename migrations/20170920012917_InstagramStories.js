exports.up = function(knex, Promise) {
    return knex.schema.createTable('instagram_stories', function (table) {
        table.increments();
        table.string('user_id', 32).notNullable();
        table.string('user_name', 64);
        table.string('entry_id', 32).notNullable();
        table.string('entry_text', 512);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('entry_created_at');
        table.unique(['user_id', 'entry_id']);
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('instagram_stories');
};
