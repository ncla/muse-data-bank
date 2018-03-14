"use strict";

var Tracker = require('./base');
var fs = require('fs');
var moment = require('moment');
var winston = require('winston');
var request = require('request-promise-native');
let cheerio = require('cheerio');
var _ = require('underscore');
const Promise = require('bluebird');
request = request.defaults({jar: true});

class YoutubeUploadTracker extends Tracker
{
    constructor(credentials, usersToTrack) {
        super(credentials);

        this.usersToTrack = usersToTrack;

        this.dbTable = 'youtube_uploads';

        this.dbCheckAgainst = {
            entry_id: 'entry_id'
        };

        return this;
    }

    pullData() {
        return Promise.map(this.usersToTrack, (channel) => {
            return request({
                url: `https://www.googleapis.com/youtube/v3/channels/?id=${channel.channel_id}&part=contentDetails,snippet&key=${this.credentials.apiKey}`,
                method: 'GET',
                json: true
            }).then((data) => {
                var userAvatar = data.items[0].snippet.thumbnails.default.url;
                var uploadsPlaylistId = data.items[0].contentDetails.relatedPlaylists.uploads;

                return request({
                    url: `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${uploadsPlaylistId}&maxResults=25&part=snippet%2CcontentDetails&key=${this.credentials.apiKey}`,
                    method: 'GET',
                    json: true
                }).then(data => {
                    return {
                        response: data,
                        userAvatar: userAvatar
                    }
                });
            }).then((data) => {
                data.response.items.forEach((item) => {
                    this.dataEntries.push({
                        user_id: channel.channel_id,
                        user_name: channel.username,
                        user_avatar: data.userAvatar,
                        entry_id: item.contentDetails.videoId,
                        entry_text: item.snippet.title,
                        entry_image: item.snippet.thumbnails.standard !== undefined ? item.snippet.thumbnails.standard.url : item.snippet.thumbnails.default.url,
                        entry_description: item.snippet.description,
                        entry_created_at: moment(item.contentDetails.videoPublishedAt).utc().format('YYYY-MM-DD HH:mm:ss'),
                        isNewEntry: false
                    });
                });
            })
        });
    }

    composeNotificationMessage(entry) {
        return {
            title: `**${entry.user_name}** uploaded a video on YouTube`,
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