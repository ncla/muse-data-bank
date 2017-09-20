"use strict";

var Tracker = require('./base');
var request = require('request');
var moment = require('moment');
var Client = require('instagram-private-api').V1;
var device = new Client.Device('museredditbob');
var storage = new Client.CookieFileStorage('./bot.json');
var winston = require('winston');
var _ = require('underscore');

class InstagramStoriesTracker extends Tracker {
    constructor(credentials, usersToTrack) {
        super(credentials, usersToTrack);

        this.usersToTrack = usersToTrack;

        this.credentials = credentials;

        this.dbTable = 'instagram_stories';

        this.dbCheckAgainst = {
            user_id: 'user_id',
            entry_id: 'entry_id'
        };

        return this;
    }

    pullData() {
        var userIdsInstagram = _.map(_.where(this.usersToTrack, {stories: true}), (user) => {
            return user.id_api;
        });

        return Client.Session.create(device, storage, this.credentials.userName, this.credentials.password)
            .then((session) => {
                return new Client.Request(session)
                    .setMethod('GET')
                    .setResource('storyTray')
                    .setData({
                        user_ids: userIdsInstagram
                    })
                    .send()
                    .then((data) => {

                        data.tray.forEach((currentUserValue, currentUserIndex) => {
                            currentUserValue.items.forEach((currentItemValue) => {
                                var mediaTypeSatisfied = currentItemValue.media_type == 1 || currentItemValue.media_type == 2;

                                if (mediaTypeSatisfied) {
                                    this.dataEntries.push({
                                        user_id: currentItemValue.user.pk,
                                        user_name: currentItemValue.user.full_name,
                                        entry_id: currentItemValue.id,
                                        entry_text: currentItemValue.media_type == 1 ? currentItemValue.image_versions2.candidates[0].url : currentItemValue.video_versions[0].url,
                                        entry_created_at: moment(currentItemValue.taken_at * 1000).utc().format('YYYY-MM-DD HH:mm:ss'),
                                        media_type: currentItemValue.media_type == 1 ? 'image' : 'video',
                                        image_url: currentItemValue.image_versions2.candidates[0].url
                                    })
                                }
                            });
                        });
                    });
            })
    }

    composeNotificationMessage(entry) {
        return {
            title: `**${entry.user_name}** posted a new ${entry.media_type} item on Instagram Story`,
            embed: {
                "type": "rich",
                "description": `${entry.entry_text}`,
                "timestamp": entry.entry_created_at,
                "color": "15844367",
                "image": {
                    "url": entry.image_url
                }
            }
        };
    }
}

module.exports = InstagramStoriesTracker;