"use strict";

var Tracker = require('./base');
var moment = require('moment');
var winston = require('winston');
var request = require('request-promise-native');
request = request.defaults({jar: true});

class YoutubePlaylistTracker extends Tracker
{
    constructor(credentials, usersToTrack, roleId, knex) {
        super(credentials);

        this.usersToTrack = usersToTrack;

        this.knex = knex;

        this.dbTable = 'youtube_playlist_videos';

        this.dbCheckAgainst = {
            entry_id: 'entry_id'
        };

        this.columnsToInsert = ['entry_id', 'entry_text', 'video_id', 'entry_created_at'];

        this.pingableRoleId = roleId;

        this.noThumbnailImageUrl = 'https://s.ytimg.com/yts/img/no_thumbnail-vfl4t3-4R.jpg';

        return this;
    }

    async pullData() {
        let playlistsResponse = await request({
            url: `https://www.googleapis.com/youtube/v3/playlists`,
            method: 'GET',
            json: true,
            qs: {
                part: 'snippet,contentDetails',
                channelId: 'UCGGhM6XCSJFQ6DTRffnKRIw',
                maxResults: '50',
                key: this.credentials.apiKey,
            }
        });

        let playlists = [];
        let playlistsToUpdate = [];

        for(const playlist of playlistsResponse.items) {
            playlists[playlist.id] = {
                id: playlist.id,
                title: playlist.snippet.title,
                videoCount: playlist.contentDetails.itemCount,
                videos: []
            };

            await this.knex('youtube_playlists').where({
                playlist_id: playlist.id,
            }).first('video_count').then(data => {
                if (data === undefined) {
                    winston.debug(`Playlist ${playlist.id} not found, inserting`);

                    return this.knex('youtube_playlists').insert({
                        playlist_id: playlist.id,
                        video_count: playlist.contentDetails.itemCount
                    }).then(() => {
                        playlistsToUpdate.push(playlist.id);
                    })
                } else if (data.video_count !== playlist.contentDetails.itemCount) {
                    winston.debug(`Playlist ${playlist.id} found, but count does not match`);
                    winston.debug(`Pushing playlist ${playlist.id} to fetch and update playlist items`);

                    return this.knex('youtube_playlists').where({
                        playlist_id: playlist.id
                    }).update({
                        video_count: playlist.contentDetails.itemCount
                    }).then(() => {
                        playlistsToUpdate.push(playlist.id);
                    });
                } else {
                    winston.debug(`Playlist ${playlist.id} has no change in video count`);

                    return data.video_count;
                }
            });
        }

        for (const playlist of Object.values(playlists)) {
            if (playlistsToUpdate.indexOf(playlist.id) === -1) {
                continue;
            }

            winston.debug(`Fetching playlist items for playlist ${playlist.id}`);

            let playlistData = await request({
                url: `https://www.googleapis.com/youtube/v3/playlistItems`,
                method: 'GET',
                json: true,
                qs: {
                    part: 'snippet',
                    playlistId: playlist.id,
                    maxResults: '50',
                    key: this.credentials.apiKey,
                }
            });

            playlistData.items.forEach((playlistItem) => {
                playlists[playlist.id].videos.push({
                    playlistItemId: playlistItem.id,
                    title: playlistItem.snippet.title,
                    description: playlistItem.snippet.description,
                    videoId: playlistItem.snippet.resourceId.videoId,
                    thumbnailImage: playlistItem.snippet.thumbnails !== undefined ? playlistItem.snippet.thumbnails.default.url : this.noThumbnailImageUrl,
                    publishedAt: playlistItem.snippet.publishedAt,
                });
            });
        }

        Object.values(playlists).forEach(playlist => {
            playlist.videos.forEach(video => {
                this.dataEntries.push({
                    entry_id: video.playlistItemId,
                    playlist_title: playlist.title,
                    video_title: video.title,
                    playlist_id: playlist.id,
                    video_id: video.videoId,
                    entry_text: `${playlist.title} | ${video.title}`,
                    entry_image: video.thumbnailImage,
                    entry_description: video.description,
                    entry_created_at: moment(video.publishedAt).utc().format('YYYY-MM-DD HH:mm:ss'),
                    isNewEntry: false
                });
            })
        });

        return this;
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} **${entry.user_name}** has added new video to a playlist`,
            embed: {
                'title': `Playlist: ${entry.playlist_title} | Video: ${entry.video_title}`,
                'type': 'rich',
                'description': entry.entry_description,
                'url': `https://www.youtube.com/watch?v=${entry.video_id}&list=${entry.playlist_id}`,
                'timestamp': entry.entry_created_at,
                'color': '15158332',
                'author': {
                    'name': 'Muse',
                    'icon_url': 'https://lh3.googleusercontent.com/a-/AOh14GgXVvURiheNyfFSu6iDbI2hSye5tHnGh-Yx055D=s176-c-k-c0x00ffffff-no-rj-mo'
                },
                'thumbnail': {
                    'url': entry.entry_image
                }
            }
        };
    }

}

module.exports = YoutubePlaylistTracker;