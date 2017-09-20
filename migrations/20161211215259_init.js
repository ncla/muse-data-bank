exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('twitter_tweets', function (table) {
            table.increments();
            table.string('user_id', 32).notNullable();
            table.string('user_name', 64);
            table.string('entry_id', 32).notNullable();
            table.string('entry_text', 512);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('entry_created_at');
            table.unique(['user_id', 'entry_id']);
        }),
        knex.schema.createTable('twitter_likes', function (table) {
            table.increments();
            table.string('user_id', 32).notNullable();
            table.string('user_name', 64);
            table.string('entry_id', 32).notNullable();
            table.string('entry_text', 512);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('entry_created_at');
            table.unique(['user_id', 'entry_id']);
        }),
        knex.schema.createTable('twitter_following', function (table) {
            table.increments();
            table.string('user_id', 32).notNullable();
            table.string('user_name', 64);
            table.string('entry_id', 32).notNullable();
            table.string('entry_text', 512);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.unique(['user_id', 'entry_id']);
        }),
        knex.schema.createTable('instagram_posts', function (table) {
            table.increments();
            table.string('user_id', 32).notNullable();
            table.string('user_name', 64);
            table.string('entry_id', 32).notNullable();
            table.string('entry_text', 512);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('entry_created_at');
            table.unique(['user_id', 'entry_id']);
        }),
        knex.schema.createTable('instagram_following', function (table) {
            table.increments();
            table.string('user_id', 32).notNullable();
            table.string('user_name', 64);
            table.string('entry_id', 32).notNullable();
            table.string('entry_text', 128);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.unique(['user_id', 'entry_id']);
        }),
        knex.schema.createTable('reddit_posts', function (table) {
            table.increments();
            table.string('user_id', 32).notNullable();
            table.string('user_name', 64);
            table.string('entry_id', 32).notNullable();
            table.string('entry_text', 512);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('entry_created_at');
            table.unique(['user_id', 'entry_id']);
        }),

        knex.schema.createTable('musemu_gigs', function (table) {
            table.increments();
            table.string('entry_id', 128).notNullable();
            table.string('entry_text', 256);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('entry_created_at');
            table.unique(['entry_id', 'entry_created_at']);
        }),
        knex.schema.createTable('musemu_news', function (table) {
            table.increments();
            table.string('entry_id', 128).notNullable();
            table.string('entry_text', 256);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('entry_created_at');
            table.unique(['entry_id', 'entry_created_at']);
        }),
        knex.schema.createTable('shop_muse', function (table) {
            table.increments();
            table.string('entry_id', 128).notNullable();
            table.string('entry_text', 256);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.unique(['entry_id']);
        }),
        knex.schema.createTable('shop_bravadousa', function (table) {
            table.increments();
            table.string('entry_id', 128).notNullable();
            table.string('entry_text', 256);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.unique(['entry_id']);
        }),

        knex.schema.createTable('facebook_posts', function (table) {
            table.increments();
            table.string('entry_id', 128).notNullable();
            table.string('entry_text', 512);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('entry_created_at');
            table.unique(['entry_id']);
        }),

        knex.schema.createTable('bootlegs', function (table) {
            table.increments();
            table.string('entry_id', 128).notNullable();
            table.string('entry_text', 512);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.unique(['entry_id']);
        }),

        knex.schema.createTable('youtube_uploads', function (table) {
            table.increments();
            table.string('user_id', 32).notNullable();
            table.string('user_name', 64);
            table.string('entry_id', 128).notNullable();
            table.string('entry_text', 512);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('entry_created_at');
            table.unique(['user_id', 'entry_id']);
        }),

    ]);
};

exports.down = function(knex, Promise) {
    // TODO: Just bring those to an array and save some lines
    return Promise.all([
        knex.schema.dropTable('twitter_tweets'),
        knex.schema.dropTable('twitter_likes'),
        knex.schema.dropTable('twitter_following'),
        knex.schema.dropTable('instagram_posts'),
        knex.schema.dropTable('instagram_following'),
        knex.schema.dropTable('reddit_posts'),
        knex.schema.dropTable('musemu_gigs'),
        knex.schema.dropTable('musemu_news'),
        knex.schema.dropTable('shop_muse'),
        knex.schema.dropTable('shop_bravadousa'),
        knex.schema.dropTable('facebook_posts'),
        knex.schema.dropTable('bootlegs'),
        knex.schema.dropTable('youtube_uploads')
    ]);
};