"use strict";

var TwitterTweetTracker = require('./trackers/twitter_tweets');
var TwitterLikesTracker = require('./trackers/twitter_likes');
var TwitterFollowingTracker = require('./trackers/twitter_following');
var InstagramPostTracker = require('./trackers/instagram_posts');
var InstagramFollowingTracker = require('./trackers/instagram_following');
var InstagramStoriesTracker = require('./trackers/instagram_stories');
var RedditPostTracker = require('./trackers/reddit_posts');
var MuseGigTracker = require('./trackers/musemu_gigs');
var MuseNewsTracker = require('./trackers/musemu_news');
var ShopMuseTracker = require('./trackers/shop_muse');
var FacebookPostsTracker = require('./trackers/facebook_posts');
var MuseBootlegsTracker = require('./trackers/bootlegs');
var YoutubeUploadTracker = require('./trackers/youtube_uploads');
var DimeTracker = require('./trackers/dime');

var NotifyManager = require('./notify_manager');
var http = require('http');
var argv = require('yargs').argv;

String.prototype.trunc = function(n) {
    return this.substr(0, n - 1) + (this.length > n ? '&hellip;' : '');
};

var globalLog = require('global-request-logger');
globalLog.initialize();

var dotenv = require('dotenv').config();
var env = process.env;
var fs = require('fs');
var stripJsonComments = require('strip-json-comments');

var winston = require('winston');
require('winston-daily-rotate-file');

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
        new winston.transports.DailyRotateFile({
            name: 'daily-all-file',
            filename: './logs/log',
            datePattern: 'yyyy-MM-dd.',
            prepend: true,
            level: 'debug',
            json: false,
            maxDays: 3
        }),
        new winston.transports.DailyRotateFile({
            name: 'daily-error-file',
            filename: './logs/error',
            datePattern: 'yyyy-MM-dd.',
            prepend: true,
            level: 'error',
            handleExceptions: true,
            humanReadableUnhandledException: true,
            prettyPrint: true,
            json: false,
            maxDays: 3
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
    }
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

globalLog.on('success', function(request, response) {
    winston.debug(`Request => ${request.href} Status => ${response.statusCode}`);
});

globalLog.on('error', function(request, response) {
    winston.debug(`Request => ${request.href} Status => ${response.statusCode}`);
});

var trackersActive = [];

readOptionsFile.then(function (data) {

    var usersToTrack = JSON.parse(stripJsonComments(data));

    var trackers = {
        TwitterTweets: new TwitterTweetTracker({
            consumer_key: env.TWITTER_CONSUMER_KEY,
            consumer_secret: env.TWITTER_CONSUMER_SECRET
        }, usersToTrack.twitter),

        TwitterLikes: new TwitterLikesTracker({
            consumer_key: env.TWITTER_CONSUMER_KEY,
            consumer_secret: env.TWITTER_CONSUMER_SECRET
        }, usersToTrack.twitter),

        TwitterFollowing: new TwitterFollowingTracker({
            consumer_key: env.TWITTER_CONSUMER_KEY,
            consumer_secret: env.TWITTER_CONSUMER_SECRET
        }, usersToTrack.twitter),

        InstagramPosts: new InstagramPostTracker({userName: env.INSTAGRAM_USERNAME, password: env.INSTAGRAM_PASSWORD}, usersToTrack.instagram, db),

        InstagramFollowing: new InstagramFollowingTracker({userName: env.INSTAGRAM_USERNAME, password: env.INSTAGRAM_PASSWORD}, usersToTrack.instagram),

        InstagramStories: new InstagramStoriesTracker({userName: env.INSTAGRAM_USERNAME, password: env.INSTAGRAM_PASSWORD}, usersToTrack.instagram),

        RedditPosts: new RedditPostTracker({
            clientId: env.REDDIT_CLIENT_ID,
            clientSecret: env.REDDIT_CLIENT_SECRET,
            username: env.REDDIT_USERNAME,
            password: env.REDDIT_PASSWORD
        }),

        MuseGigs: new MuseGigTracker(),
        MuseNews: new MuseNewsTracker(),
        ShopMuse: new ShopMuseTracker(),
        FacebookPosts: new FacebookPostsTracker({appId: env.FB_APP_ID, appSecret: env.FB_APP_SECRET}),
        MuseBootlegs: new MuseBootlegsTracker({username: env.MUSEBOOTLEGS_USERNAME, password: env.MUSEBOOTLEGS_PASSWORD}),
        YoutubeUploads: new YoutubeUploadTracker({apiKey: env.YOUTUBE_DATA_API}, usersToTrack.youtube),
        DimeTorrents: new DimeTracker({username: env.DIME_USERNAME, password: env.DIME_PASSWORD})
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
                winston.info('Not sending notifications');
            } else {
                NotifyManager.notify();
            }
    });

}).catch((err) => { console.error(err, err.stack); });