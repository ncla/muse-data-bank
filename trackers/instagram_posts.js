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
        return Promise.map(_.where(this.usersToTrack, {posts: true}), (user) => {
            return request(`https://www.instagram.com/${user.id}/?__a=1`, {
                method: 'GET',
                headers: {
                    'accept': '*/*',
                    'accept-encoding': 'gzip, deflate, br',
                    'accept-language': 'en-US,en;q=0.9,lv;q=0.8',
                    'cache-control': 'no-cache',
                    'dnt': '1',
                    'pragma': 'no-cache',
                    'referer': `https://www.instagram.com/${user.id}/`,
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
                    'x-requested-with': 'XMLHttpRequest',
                },
                json: true,
                timeout: (30 * 1000),
                resolveWithFullResponse: true,
                gzip: true
            }).then((response) => {
                var responseBody = response.body;

                try {
                    for (let value of responseBody.user.media.nodes) {
                        this.dataEntries.push({
                            user_id: responseBody.user.id,
                            user_name: responseBody.user.username,
                            user_avatar: responseBody.user.profile_pic_url,
                            entry_id: value.id + '_' + responseBody.user.id,
                            entry_link_id: value.code,
                            entry_text: (value.caption ? value.caption : null),
                            entry_image: value.thumbnail_src,
                            entry_created_at: moment(value.date * 1000).utc().format('YYYY-MM-DD HH:mm:ss'),
                            isNewEntry: false
                        });
                    }
                } catch (err) {
                    winston.error(err);
                    winston.debug(response.body);
                    throw Error(`Instagram response body has something exceptional! Code: ${response.statusCode}`);
                }
            });
        }, {concurrency: 1});
    }

    composeNotificationMessage(entry) {
        return {
            title: `**${entry.user_name}** posted on Instagram`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
                "description": entry.entry_description,
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