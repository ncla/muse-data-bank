"use strict";

var Tracker = require('./base');
var request = require('request-promise-native');
var moment = require('moment');
var winston = require('winston');
const Promise = require('bluebird');
var Client = require('instagram-private-api').V1;
var device = new Client.Device('museredditbob');
var storage = new Client.CookieFileStorage('./bot.json');
var _ = require('underscore');
var argv = require('yargs').argv;
const util = require('util');
const exec = util.promisify(require('child_process').exec);

class InstagramPostTracker extends Tracker {
    constructor(credentials, usersToTrack, db) {
        super(credentials, usersToTrack);

        this.usersToTrack = usersToTrack;

        this.credentials = credentials;

        this.dbTable = 'instagram_posts';

        this.db = db;

        this.dbCheckAgainst = {
            user_id: 'user_id',
            entry_id: 'entry_id'
        };

        return this;
    }

    pullData() {
        var igUserIdsApi = _.map(_.where(this.usersToTrack, {posts: true}), (user) => {
            return user.id_api;
        });

        if (igUserIdsApi.length === 0) {
            return Promise.reject('No users');
        }

        winston.debug(`${this.constructor.name} :: Calling shell to run PHP script`);

        return exec(`php instagram/Posts.php ${this.credentials.userName} ${this.credentials.password} ${igUserIdsApi.join(',')}`).then(std => {
            winston.debug(`${this.constructor.name} :: Shell response length - ${std.stdout.length}`);
            winston.debug(`${this.constructor.name} :: Shell response error - ${std.stderr}`);

            this.dataEntries = JSON.parse(std.stdout);
        });
    }

    composeNotificationMessage(entry) {
        return {
            title: `**${entry.user_name}** posted on Instagram`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
                "url": `https://www.instagram.com/p/${entry.entry_link_id}/`,
                "timestamp": entry.entry_created_at,
                "color": "15844367",
                "author": {
                    "name": entry.user_name,
                    "icon_url": entry.user_avatar
                },
                "image": {
                    "url": entry.entry_image
                }
            }
        };
    }
}

module.exports = InstagramPostTracker;