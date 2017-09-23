"use strict";

var Tracker = require('./base');
var TwitterTweeetTracker = require('./twitter_tweets');
var fs = require('fs');
var moment = require('moment');
var winston = require('winston');
var dedent = require('dedent-js');
var _ = require('underscore');
const Promise = require('bluebird');

class TwitterLikesTracker extends TwitterTweeetTracker
{
    constructor(credentials, usersToTrack) {
        super(credentials, usersToTrack);

        this.dbTable = 'twitter_likes';

        return this;
    }

    pullData() {
        return Promise.map(_.where(this.usersToTrack, {likes: true}), (user) => {
            return this.client.get('favorites/list', { user_id: user.id }, (err, data, response) => {
                for (let value of data) {
                    this.dataEntries.push({
                        user_id: user.id,
                        user_name: user.name,
                        user_avatar: value.user.profile_image_url_https,
                        user_screenname: value.user.screen_name,
                        entry_id: value.id_str,
                        entry_text: value.text,
                        entry_created_at: moment(value.created_at, 'dd MMM DD HH:mm:ss ZZ YYYY').utc().format('YYYY-MM-DD HH:mm:ss'),
                        isNewEntry: false
                    });
                }
            })
        });
    }

    composeNotificationMessage(entry) {
        return {
            title: `**${entry.user_name}** liked a tweet`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
                "description": entry.entry_description,
                "url": `https://twitter.com/${entry.user_screenname}/status/${entry.entry_id}`,
                "timestamp": entry.entry_created_at,
                "color": "3447003",
                "author": {
                    "name": entry.user_screenname,
                    "icon_url": entry.user_avatar
                }
            }
        };
    }

}

module.exports = TwitterLikesTracker;