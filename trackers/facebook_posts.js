"use strict";

var Tracker = require('./base');
var request = require('request');
var moment = require('moment');
var rssParser = require('rss-parser');
const url = require('url');
var FB = require('fb');
var winston = require('winston');
var dedent = require('dedent-js');

class FacebookPostsTracker extends Tracker {
    constructor(credentials, usersToTrack) {
        super(credentials, usersToTrack);

        this.dbTable = 'facebook_posts';

        this.dbCheckAgainst = {
            entry_id: 'entry_id'
        };

        this.columnsToInsert = ['entry_id', 'entry_text', 'entry_created_at'];

        return this;
    }

    pullData() {

        return new Promise((resolve, reject) => {
            FB.setAccessToken(`${this.credentials.appId}|${this.credentials.appSecret}`);

            FB.api(
                '/muse/posts',
                'GET',
                {},
                (response) => {
                    if (!response || response.error) {
                        reject(!res ? 'Error occurred' : res.error);
                    }

                    response.data.forEach((post) => {
                        this.dataEntries.push({
                            entry_id: post.id,
                            entry_text: post.message || post.story || '',
                            entry_created_at: moment(post.created_time).utc().format('YYYY-MM-DD HH:mm:ss')
                        });
                    });

                    resolve();
                }
            );
        });

    }

    composeNotificationMessage(entry) {
        return {
            title: `**Muse** posted on Facebook`,
            embed: {
                "type": "rich",
                "description": entry.entry_text + `\n\n[Open post](https://facebook.com/${entry.entry_id.split('_')[1]})`,
                "url": `https://facebook.com/${entry.entry_id.split('_')[1]}`,
                "timestamp": entry.entry_created_at,
                "color": "2123412"
            }
        };
    }
}

module.exports = FacebookPostsTracker;