"use strict";

var TwitterTweetTracker = require('./trackers/twitter_tweets');
var TwitterLikesTracker = require('./trackers/twitter_likes');
var TwitterFollowingTracker = require('./trackers/twitter_following');
var InstagramPostTracker = require('./trackers/instagram_posts');
var InstagramPostProxiedTracker = require('./trackers/instagram_posts_proxied')
var InstagramFollowingTracker = require('./trackers/instagram_following');
var InstagramStoriesTracker = require('./trackers/instagram_stories');
var RedditPostTracker = require('./trackers/reddit_posts');
var MuseGigTracker = require('./trackers/musemu_gigs');
var MuseGigTrackerProxied = require('./trackers/musemu_gigs_proxied');
var MuseNewsTracker = require('./trackers/musemu_news');
var MuseNewsTrackerProxied = require('./trackers/musemu_news_proxied');
var MuseSitemapTracker = require('./trackers/musemu_sitemap_proxied');
var ShopMuseTracker = require('./trackers/shop_muse');
var ShopMuseTrackerProxied = require('./trackers/shop_muse_proxied');
var FacebookPostsTracker = require('./trackers/facebook_posts');
var MuseBootlegsTracker = require('./trackers/bootlegs');
var YoutubeUploadTracker = require('./trackers/youtube_uploads');
var YoutubePlaylistTracker = require('./trackers/youtube_playlists');
var DimeTracker = require('./trackers/dime');
let ShopSitemapMuseTracker = require('./trackers/shop_sitemap');
let ShopSitemapMuseTrackerProxied = require('./trackers/shop_sitemap_proxied');
let ShopMuseCanadaTrackerProxied = require('./trackers/shop_muse_canada_proxied');

var NotifyManager = require('./notify_manager');
var http = require('http');
var argv = require('yargs').argv;

String.prototype.trunc = function(n) {
    return this.substr(0, n - 1) + (this.length > n ? '&hellip;' : '');
};

Promise.prototype.thenWait = function thenWait(time) {
    return this.then(result => new Promise(resolve => setTimeout(resolve, time, result)));
};

var dotenv = require('dotenv').config();
var env = process.env;
var fs = require('fs');
var stripJsonComments = require('strip-json-comments');

var winston = require('winston');

winston.configure({
    transports: [
        new (winston.transports.Console)({
            name: 'console',
            colorize: 'all',
            timestamp: true,
            handleExceptions: true,
            humanReadableUnhandledException: true,
            level: 'debug'
        }),
        new winston.transports.File({
            name: 'file.error',
            filename: './logs/error.log',
            level: 'error',
            prepend: true,
            json: false,
        }),
        new winston.transports.File({
            name: 'file.debug',
            filename: './logs/debug.log',
            level: 'debug',
            prepend: true,
            json: false,
        }),
    ]
});

winston.addColors({
    debug: 'cyan'
});

winston.info('Starting');

var db = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: "./sqlite.db"
    },
    useNullAsDefault: true
});

var readOptionsFile = new Promise(function(resolve, reject) {
    fs.readFile('options.json', 'utf8', function (err, data){
        if (err) {
            reject(err);
        } else {
            resolve(data);
        }
    });
});

// db.on('query', function(data) {
//     console.log(data);
// });

var trackersActive = [];

readOptionsFile.then(function (data) {

    var usersToTrack = JSON.parse(stripJsonComments(data));

    var trackers = {
        TwitterTweets: new TwitterTweetTracker({
            consumer_key: env.TWITTER_CONSUMER_KEY,
            consumer_secret: env.TWITTER_CONSUMER_SECRET
        }, usersToTrack.twitter, env.ROLE_ID_TWITTER_TWEETS),

        TwitterLikes: new TwitterLikesTracker({
            consumer_key: env.TWITTER_CONSUMER_KEY,
            consumer_secret: env.TWITTER_CONSUMER_SECRET
        }, usersToTrack.twitter, env.ROLE_ID_TWITTER_LIKES),

        TwitterFollowing: new TwitterFollowingTracker({
            consumer_key: env.TWITTER_CONSUMER_KEY,
            consumer_secret: env.TWITTER_CONSUMER_SECRET
        }, usersToTrack.twitter, env.ROLE_ID_TWITTER_FOLLOWING),

        InstagramPosts: new InstagramPostProxiedTracker({userName: env.INSTAGRAM_USERNAME, password: env.INSTAGRAM_PASSWORD}, usersToTrack.instagram, env.ROLE_ID_INSTAGRAM_POSTS, env.SOCKS_PROXY),

        InstagramFollowing: new InstagramFollowingTracker({userName: env.INSTAGRAM_USERNAME, password: env.INSTAGRAM_PASSWORD}, usersToTrack.instagram),

        InstagramStories: new InstagramStoriesTracker({userName: env.INSTAGRAM_USERNAME, password: env.INSTAGRAM_PASSWORD}, usersToTrack.instagram),

        RedditPosts: new RedditPostTracker({
            clientId: env.REDDIT_CLIENT_ID,
            clientSecret: env.REDDIT_CLIENT_SECRET,
            username: env.REDDIT_USERNAME,
            password: env.REDDIT_PASSWORD
        }, null, env.ROLE_ID_REDDIT_POSTS),

        MuseGigs: new MuseGigTracker(null, null, env.ROLE_ID_MUSE_GIGS),
        MuseGigsProxied: new MuseGigTrackerProxied(null, null, env.ROLE_ID_MUSE_GIGS, env.SOCKS_PROXY),
        MuseNews: new MuseNewsTracker(null, null, env.ROLE_ID_MUSE_NEWS),
        MuseNewsProxied: new MuseNewsTrackerProxied(null, null, env.ROLE_ID_MUSE_NEWS, env.SOCKS_PROXY),
        MuseSitemap: new MuseSitemapTracker(null, null, env.ROLE_ID_SITEMAPS, env.SOCKS_PROXY),
        ShopMuse: new ShopMuseTracker(null, null, env.ROLE_ID_MUSE_SHOP),
        ShopMuseProxied: new ShopMuseTrackerProxied(null, null, env.ROLE_ID_MUSE_SHOP, env.SOCKS_PROXY),
        ShopMuseCanadaProxied: new ShopMuseCanadaTrackerProxied(null, null, env.ROLE_ID_MUSE_SHOP, env.SOCKS_PROXY),
        ShopSitemapMuse: new ShopSitemapMuseTracker(null, null, env.ROLE_ID_SITEMAPS),
        ShopSitemapMuseProxied: new ShopSitemapMuseTrackerProxied(null, null, env.ROLE_ID_SITEMAPS, env.SOCKS_PROXY),
        FacebookPosts: new FacebookPostsTracker({appId: env.FB_APP_ID, appSecret: env.FB_APP_SECRET}),
        MuseBootlegs: new MuseBootlegsTracker({username: env.MUSEBOOTLEGS_USERNAME, password: env.MUSEBOOTLEGS_PASSWORD}, null, env.ROLE_ID_MUSE_BOOTLEGS),
        YoutubeUploads: new YoutubeUploadTracker({apiKey: env.YOUTUBE_UPLOADS_DATA_API}, usersToTrack.youtube, env.ROLE_ID_YOUTUBE_UPLOADS),
        YoutubePlaylists: new YoutubePlaylistTracker({apiKey: env.YOUTUBE_PLAYLIST_DATA_API}, null, env.ROLE_ID_YOUTUBE_PLAYLISTS, db),
        DimeTorrents: new DimeTracker({username: env.DIME_USERNAME, password: env.DIME_PASSWORD}, null, env.ROLE_ID_DIME_BOOTLEGS)
    };

    if (argv.all === true) {
        for (var key in trackers) {
            trackersActive.push(trackers[key]);
        }
    } else {
        for (var key in argv) {
            if (argv[key] === true && trackers.hasOwnProperty(key)) {
                trackersActive.push(trackers[key]);
            }
        }
    }

    if (trackersActive.length === 0) {
        winston.info('No active trackers');
        return;
    }

    var trackerPromises = [];

    winston.profile('all-trackers');

    for (let tracker of trackersActive) {
        trackerPromises.push(tracker.pullData().then(() => {
            winston.info(tracker.constructor.name + ' :: Data pull successful');
        }).catch(err => winston.error(err))
            .then(() => tracker.compareWithDb(db))
            .then(() => {
                if (argv.noinsert !== true) {
                     return tracker.insertNewEntries(db).then(() => {
                         winston.info(tracker.constructor.name + ' :: Insertion completed ( ͡° ͜ʖ ͡°)');
                     });
                }

                return Promise.resolve();
            })
            .catch(err => winston.error(err)));
    }

    return Promise.all(trackerPromises)
        .then(() => {
            return db.destroy().then(() => {
                winston.debug('DB connection is closed');
            });
        })
        .then(() => {
            winston.profile('all-trackers');

            if (argv.nonotify === true || argv.silent === true) {
                return winston.info('Not sending notifications');
            } else {
                return NotifyManager.notify();
            }
    }).then(() => {
        process.exit()
    })

}).catch((err) => { console.error(err, err.stack); });