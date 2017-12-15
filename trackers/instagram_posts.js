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
        // This `sesion` variable is nothing until you interact with it's Promise
        var session = new Client.Session.create(device, storage, this.credentials.userName, this.credentials.password);
        var sessionInstance;

        var userIdsInstagram = _.map(_.where(this.usersToTrack, {posts: true}), (user) => {
            return user.id_api;
        });

        return session.then((session) => {
            sessionInstance = session;
            return sessionInstance.getAccountId();
        }).then((accountId) => {
            return this.getLastCheckedFollowedAccountsTime().then((time) => {
                if (parseInt(moment().format('x')) - parseInt(time) > (1000 * 60 * 24 * 7) || argv.ForceUpdate === true) {
                    winston.debug(`Checking followed accounts`);

                    return this.updateLastCheckedFollowedAccountsTime()
                            .then(this.processFollowedAccounts(sessionInstance, accountId));
                } else {
                    winston.debug('Account followings have been checked recently, skipping!');
                }

                return Promise.resolve();
            });
        }).then(() => {
            return new Client.Feed.Timeline(sessionInstance).get().then((data) => {
                for (let value of data) {
                    // In cases where the account has followed users that we are not interested in, and where we can't be bothered to unfollow them
                    if (_.indexOf(userIdsInstagram, value._params.user.pk.toString()) !== -1) {
                        this.dataEntries.push({
                            user_id: value._params.user.pk,
                            user_name: value._params.user.username,
                            user_avatar: value._params.user.profile_pic_url,
                            entry_id: value.id,
                            entry_link_id: value._params.code,
                            entry_text: (value._params.caption ? value._params.caption : null),
                            entry_image: value._params.images[0].url,
                            entry_created_at: moment(value._params.takenAt).utc().format('YYYY-MM-DD HH:mm:ss'),
                            isNewEntry: false
                        });
                    }
                }
            });
        });
    }

    getLastCheckedFollowedAccountsTime() {
        return this.db('meta').where({
            name: 'followedAccountsLastCheckedTimestamp'
        }).select('value').then((rows) => {
            if (rows.length === 0) {
                throw Error('Missing value in meta table');
            }

            return rows[0].value;
        });
    }

    updateLastCheckedFollowedAccountsTime() {
        winston.debug('Updating followedAccountsLastCheckedTimestamp meta value in DB');

        return this.db('meta')
            .where('name', 'followedAccountsLastCheckedTimestamp')
            .update({
                value: moment().format('x')
            });
    }

    processFollowedAccounts(session, accountId) {
        return new Client.Feed.AccountFollowing(session, accountId).get().then((data) => {
            var currentlyFollowedIds = _.map(data, (user) => {
                return user.id.toString();
            });

            var trackedAccountIds = _.map(this.usersToTrack, (user) => {
                return user.id_api;
            });

            var needToBeFollowed = _.difference(trackedAccountIds, currentlyFollowedIds);

            return _.difference(trackedAccountIds, currentlyFollowedIds);
        }).then((accountsToFollow) => {
            if (accountsToFollow.length === 0) {
                winston.info('No accounts needed to be followed!');

                return Promise.resolve();
            }

            return Promise.map(accountsToFollow, (accountId) => {
                return Client.Relationship.create(session, accountId).then((d) => {
                    return Promise.delay(2500);
                })
            }, {concurrency: 1});

        })
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