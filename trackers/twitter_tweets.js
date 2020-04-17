"use strict";

var Tracker = require('./base');
var TwitterClient = require('twit');
var fs = require('fs');
var moment = require('moment');
var winston = require('winston');
var dedent = require('dedent-js');
var _ = require('underscore');
const Promise = require('bluebird');

class TwitterTweetTracker extends Tracker
{
    constructor(credentials, usersToTrack, roleId) {
        super(credentials);

        this.usersToTrack = usersToTrack;

        this.credentials = Object.assign(credentials, {'app_only_auth': true});

        this.client = new TwitterClient(credentials);

        this.dbTable = 'twitter_tweets';

        this.dbCheckAgainst = {
            user_id: 'user_id',
            entry_id: 'entry_id'
        };

        this.pingableRoleId = roleId;

        return this;
    }

    pullData() {
        return Promise.map(_.where(this.usersToTrack, {tweets: true}), (user) => {
            return this.client.get('statuses/user_timeline', { user_id: user.id }).then((result) => {
                for (let value of result.data) {
                    this.dataEntries.push({
                        user_id: value.user.id_str,
                        user_name: value.user.name,
                        user_screenname: value.user.screen_name,
                        user_avatar: value.user.profile_image_url_https,
                        entry_id: value.id_str,
                        entry_text: value.text,
                        entry_created_at: moment(value.created_at, 'dd MMM DD HH:mm:ss ZZ YYYY').utc().format('YYYY-MM-DD HH:mm:ss'),
                        isNewEntry: false
                    });
                }
            });
        });
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} **${entry.user_name}** tweeted`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
                "description": entry.entry_description,
                "url": `https://twitter.com/${entry.user_screenname}/status/${entry.entry_id}`,
                "timestamp": entry.entry_created_at,
                "color": "3447003",
                "author": {
                    "name": entry.user_name,
                    "icon_url": entry.user_avatar
                }
            }
        };
    }

}

module.exports = TwitterTweetTracker;