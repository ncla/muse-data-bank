"use strict";

var Tracker = require('./base');
var TwitterClient = require('twit');
var fs = require('fs');
var moment = require('moment');
var winston = require('winston');
var dedent = require('dedent-js');

class TwitterTweetTracker extends Tracker
{
    constructor(credentials, usersToTrack) {
        super(credentials);

        this.usersToTrack = usersToTrack;

        this.credentials = Object.assign(credentials, {'app_only_auth': true});

        this.client = new TwitterClient(credentials);

        this.dbTable = 'twitter_tweets';

        this.dbCheckAgainst = {
            user_id: 'user_id',
            entry_id: 'entry_id'
        };

        return this;
    }

    pullData() {
        var promises = [];

        for (let user of this.usersToTrack) {
            if (user.tweets === true) {
                // TODO: Maybe rewrite this to have manual resolving/rejecting Promises
                promises.push(this.client.get('statuses/user_timeline', { user_id: user.id }, (err, data, response) => {
                    // console.log(user.name);
                    // console.log(data[0].text);
                    //
                    //console.log(data[0]);
                    for (let value of data) {
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
                }));
            }
        }

        return Promise.all(promises);
    }

    composeNotificationMessage(entry) {
        return {
            title: `**${entry.user_name}** tweeted`,
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