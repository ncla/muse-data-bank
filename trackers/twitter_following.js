"use strict";

var Tracker = require('./base');
var TwitterTweeetTracker = require('./twitter_tweets');
var fs = require('fs');
var moment = require('moment');
var winston = require('winston');
var _ = require('underscore');
const Promise = require('bluebird');

class TwitterFollowingTracker extends TwitterTweeetTracker
{
    constructor(credentials, usersToTrack, roleId) {
        super(credentials, usersToTrack);

        this.dbTable = 'twitter_following';

        this.pingableRoleId = roleId;

        return this;
    }

    pullData() {
        return Promise.map(_.where(this.usersToTrack, {following: true}), (user) => {
            return this.client.get('friends/list', { user_id: user.id, count: 200 }).then((result) => {
                for (let value of result.data.users) {
                    this.dataEntries.push({
                        user_id: user.id,
                        user_name: user.name,
                        entry_id: value.id_str,
                        entry_text: value.name,
                        entry_screenname: value.screen_name,
                        entry_user_avatar: value.profile_image_url_https,
                        isNewEntry: false
                    });
                }
            })
        });
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} **${entry.user_name}** followed an account on Twitter`,
            embed: {
                "type": "rich",
                "description": entry.entry_description,
                "timestamp": entry.entry_created_at,
                "color": "3447003",
                "fields": [
                    {
                        "name": "Account Name",
                        "value": `[${entry.entry_text}](https://twitter.com/${entry.entry_screenname})`
                    }
                ],
                "thumbnail": {
                    "url": entry.entry_user_avatar
                }
            }
        };
    }

}

module.exports = TwitterFollowingTracker;