"use strict";

var Tracker = require('./base');
var request = require('request');
var moment = require('moment');
var async = require('async');
var winston = require('winston');
var dedent = require('dedent-js');

class InstagramPostTracker extends Tracker {
    constructor(credentials, usersToTrack) {
        super(credentials, usersToTrack);

        this.usersToTrack = usersToTrack;

        this.credentials = credentials;

        this.dbTable = 'instagram_posts';

        this.dbCheckAgainst = {
            user_id: 'user_id',
            entry_id: 'entry_id'
        };

        return this;
    }

    // TODO: Errors are not catched here, but stop the whole application. Queue, callbacks and promisefied mess.
    pullData() {
        return new Promise((resolve, reject) => {
            var q = async.queue((task, callback) => {
                console.log('Sending request', task);

                request(`https://www.instagram.com/${task.user}/media/`, {
                    method: 'GET',
                    headers: {
                        'Content-type': 'application/json'
                    }
                }, (error, response, body) => {
                    if (error) {
                        return callback(error);
                    }

                    console.log(this.constructor.name + ' :: ' + response.request.href + ', Status: ' + response.statusCode);

                    var parsed;

                    try {
                        parsed = JSON.parse(body);
                    } catch (e) {
                        parsed = null;
                    }

                    if (parsed !== null) {
                        for (let value of parsed.items) {
                            this.dataEntries.push({
                                user_id: value.user.id,
                                user_name: value.user.username,
                                user_avatar: value.user.profile_picture,
                                entry_id: value.id,
                                entry_link_id: value.code,
                                entry_text: (value.caption ? value.caption.text : null),
                                entry_image: value.images.thumbnail.url,
                                entry_created_at: moment(value.created_time * 1000).utc().format('YYYY-MM-DD HH:mm:ss'),
                                isNewEntry: false
                            });
                        }
                    }

                    return callback();
                });

            }, 1);

            q.drain = () => {
                console.log(this.constructor.name + ' :: All queue items have been processed');
                resolve();
            };

            q.error = (error, task) => {
                reject(error);
                q.kill();
            };

            for (let user of this.usersToTrack) {
                q.push({user: user.id});
            }

        });
    }

    composeNotificationMessage(entry) {
        return {
            title: `**${entry.user_name}** posted an image on Instagram`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
                "description": entry.entry_description,
                "url": `https://www.instagram.com/p/${entry.entry_link_id}/`,
                "timestamp": entry.entry_created_at,
                "color": "15105570",
                "author": {
                    "name": entry.user_name,
                    "icon_url": entry.user_avatar
                },
                "thumbnail": {
                    "url": entry.entry_image,
                    "height": 150, // Resolution changes do not work on Discord. Perhaps I am passing it incorrectly
                    "width": 150
                }
            }
        };
    }
}

module.exports = InstagramPostTracker;