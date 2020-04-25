exports.up = function(knex, Promise) {
    return knex.schema.createTable('youtube_playlist_videos', function (table) {
        table.increments();
        table.string('entry_id', 128).notNullable();
        table.string('entry_text', 256);
        table.string('video_id', 64);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('entry_created_at');
        table.unique(['entry_id']);
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTableIfExists('youtube_playlist_videos');
};