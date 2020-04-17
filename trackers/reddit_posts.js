"use strict";

var Tracker = require('./base');
var request = require('request');
var moment = require('moment');
const snoowrap = require('snoowrap');
var winston = require('winston');

class RedditPostTracker extends Tracker {
    constructor(credentials, usersToTrack, roleId) {
        super(credentials, usersToTrack);

        this.usersToTrack = usersToTrack;

        this.credentials = Object.assign(credentials, {'userAgent': '/r/muse bot'});

        this.dbTable = 'reddit_posts';

        this.dbCheckAgainst = {
            user_id: 'user_id',
            entry_id: 'entry_id'
        };

        this.pingableRoleId = roleId;

        this.client = new snoowrap(this.credentials);

        return this;
    }

    pullData() {

        return this.client.getSubreddit('muse').getNew().then((posts) => {
            posts.forEach(function (post) {
                this.dataEntries.push({
                    user_id: post.author.name,
                    user_name: post.author.name,
                    entry_id: post.id,
                    entry_text: post.title,
                    post_content: post.selftext,
                    post_url: post.url,
                    post_thumbnail: post.thumbnail !== 'self' ? post.thumbnail : null,
                    entry_created_at: moment(post.created_utc * 1000).utc().format('YYYY-MM-DD HH:mm:ss'),
                    isNewEntry: false
                });
            }, this);
        });

    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} New Reddit post on /r/muse by **${entry.user_name}**`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
                "description": entry.post_content,
                "url": `https://redd.it/${entry.entry_id}`,
                "timestamp": entry.entry_created_at,
                "color": "15105570",
                "fields": [
                    {
                        "name": "User",
                        "value": `[${entry.user_name}](https://reddit.com/user/${entry.user_name})`,
                        "inline": true
                    },
                    {
                        "name": "Thread",
                        "value": `[Open thread](https://redd.it/${entry.entry_id})`,
                        "inline": true
                    }
                ],
                "thumbnail": {
                    "url": entry.post_thumbnail
                }
            }
        };
    }
}

module.exports = RedditPostTracker;