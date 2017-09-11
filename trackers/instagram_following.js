"use strict";

var Tracker = require('./base');
var request = require('request');
var moment = require('moment');

var Client = require('instagram-private-api').V1;
var device = new Client.Device('museredditbob');
var storage = new Client.CookieFileStorage('./bot.json');
var winston = require('winston');
var dedent = require('dedent-js');

class InstagramFollowingTracker extends Tracker {
    constructor(credentials, usersToTrack) {
        super(credentials, usersToTrack);

        this.usersToTrack = usersToTrack;

        this.credentials = credentials;

        this.dbTable = 'instagram_following';

        this.dbCheckAgainst = {
            user_id: 'user_id',
            entry_id: 'entry_id'
        };

        return this;
    }

    pullData() {
        return Client.Session.create(device, storage, this.credentials.userName, this.credentials.password)
            .then((session) => {
                console.log('session got');

                var promises = [];

                this.usersToTrack.forEach((user) => {
                    if (user.following === true) {
                        promises.push(new Client.Feed.AccountFollowing(session, user.id_api).all()
                            .then((users) => {
                                // There is some weird issue where some IDs in DB were inserted as float, that's why we are remapping value here
                                users.forEach((userValue, userIndex) => {
                                    users[userIndex].id = users[userIndex].id.toString();
                                });

                                return {
                                    user_id: user.id_api,
                                    user_name: user.id,
                                    following: users
                                };
                            }));
                    }
                });

                return Promise.all(promises);
            }).then((followingResults) => {
                followingResults.forEach((user) => {
                    user.following.forEach((followingUser) => {
                        console.log(followingUser);
                        this.dataEntries.push({
                            user_id: user.user_id,
                            user_name: user.user_name,
                            entry_id: followingUser.id,
                            entry_username: followingUser._params.username,
                            entry_user_avatar: followingUser._params.picture,
                            entry_user_fullname: followingUser._params.fullName,
                        })
                    });
                });
            });
    }

    composeNotificationMessage(entry) {
        return {
            title: `**${entry.user_name}** followed an account on Twitter`,
            embed: {
                "type": "rich",
                "description": `[${entry.entry_user_fullname}](https://instagram.com/${entry.entry_username})`,
                "timestamp": entry.entry_created_at,
                "color": "3447003",
                "thumbnail": {
                    "url": entry.entry_user_avatar
                }
            }
        };
    }
}

module.exports = InstagramFollowingTracker;