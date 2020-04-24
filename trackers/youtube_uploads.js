"use strict";

var Tracker = require('./base');
var moment = require('moment');
var winston = require('winston');
var request = require('request-promise-native');
const Promise = require('bluebird');
var _ = require('underscore');
request = request.defaults({jar: true});

class YoutubeUploadTracker extends Tracker
{
    constructor(credentials, usersToTrack, roleId) {
        super(credentials);

        this.usersToTrack = usersToTrack;

        this.dbTable = 'youtube_uploads';

        this.dbCheckAgainst = {
            entry_id: 'entry_id'
        };

        this.pingableRoleId = roleId;

        return this;
    }

    pullData() {
        return Promise.map(_.where(this.usersToTrack, {uploads: true}), (channel) => {
            return request({
                url: `https://www.googleapis.com/youtube/v3/playlistItems`,
                method: 'GET',
                json: true,
                qs: {
                    playlistId: channel.uploads_playlist_id,
                    maxResults: '25',
                    part: 'snippet',
                    key: this.credentials.apiKey,
                }
            }).then((data) => {
                data.items.forEach((item) => {
                    this.dataEntries.push({
                        user_id: channel.channel_id,
                        user_name: channel.username,
                        user_avatar: channel.avatar_url,
                        entry_id: item.snippet.resourceId.videoId,
                        entry_text: item.snippet.title,
                        entry_image: item.snippet.thumbnails.standard !== undefined ? item.snippet.thumbnails.standard.url : item.snippet.thumbnails.default.url,
                        entry_description: item.snippet.description,
                        entry_created_at: moment(item.snippet.publishedAt).utc().format('YYYY-MM-DD HH:mm:ss'),
                        isNewEntry: false
                    });
                });
            })
        });
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} **${entry.user_name}** uploaded a video on YouTube`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
                "description": entry.entry_description,
                "url": `https://youtu.be/${entry.entry_id}`,
                "timestamp": entry.entry_created_at,
                "color": "15158332",
                "author": {
                    "name": entry.user_name,
                    "icon_url": entry.user_avatar
                },
                "thumbnail": {
                    "url": entry.entry_image
                }
            }
        };
    }

}

module.exports = YoutubeUploadTracker;