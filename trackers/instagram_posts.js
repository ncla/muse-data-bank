"use strict";

var Tracker = require('./base');
var request = require('request-promise-native');
var moment = require('moment');
var winston = require('winston');
const Promise = require('bluebird');
var _ = require('underscore');

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

    pullData() {
        return Promise.map(_.where(this.usersToTrack, {posts: true}), (user) => {
            return request(`https://www.instagram.com/${user.id}/media/`, {
                method: 'GET',
                headers: {
                    'Content-type': 'application/json'
                },
                json: true,
                timeout: (30 * 1000)
            }).then((data) => {
                for (let value of data.items) {
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
            });
        }, {concurrency: 1});
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