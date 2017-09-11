"use strict";

var Tracker = require('./base');
var TwitterTweeetTracker = require('./twitter_tweets');
var TwitterClient = require('twit');
var fs = require('fs');
var moment = require('moment');
var winston = require('winston');
var dedent = require('dedent-js');

class TwitterFollowingTracker extends TwitterTweeetTracker
{
    constructor(credentials, usersToTrack) {
        super(credentials, usersToTrack);

        this.dbTable = 'twitter_following';

        return this;
    }

    pullData() {
        var promises = [];

        for (let user of this.usersToTrack) {
            if (user.following === true) {
                promises.push(this.client.get('friends/list', { user_id: user.id, count: 200 }, (err, data, response) => {
                    // console.log(user.name);
                    //console.log(data[0]); throw Error();

                    for (let value of data.users) {
                        //console.log(value.text);
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
                }));
            }
        }

        return Promise.all(promises);
    }

    composeNotificationMessage(entry) {
        return {
            title: `**${entry.user_name}** followed an account on Twitter`,
            embed: {
                // "title": entry.entry_text,
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