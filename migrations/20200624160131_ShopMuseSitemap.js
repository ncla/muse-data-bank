exports.up = function(knex, Promise) {
    return knex.schema.createTable('shop_sitemap_muse', function (table) {
        table.increments();
        table.string('url', 512).notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.unique(['url']);
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTableIfExists('shop_sitemap_muse');
};