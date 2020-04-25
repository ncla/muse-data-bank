exports.up = function(knex, Promise) {
    return knex.schema.createTable('youtube_playlists', function (table) {
        table.increments();
        table.string('playlist_id', 128).notNullable();
        table.integer('video_count').notNullable().defaultTo(0);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.unique(['playlist_id']);
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTableIfExists('youtube_playlists');
};