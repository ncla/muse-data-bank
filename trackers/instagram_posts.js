"use strict";

var Tracker = require('./base');
var request = require('request-promise-native');
var moment = require('moment');
var winston = require('winston');
const Promise = require('bluebird');
var _ = require('underscore');

class InstagramPostTracker extends Tracker {
    constructor(credentials, usersToTrack, roleId) {
        super(credentials, usersToTrack);

        this.usersToTrack = usersToTrack;

        this.credentials = credentials;

        this.dbTable = 'instagram_posts';

        this.dbCheckAgainst = {
            user_id: 'user_id',
            entry_id: 'entry_id'
        };

        this.pingableRoleId = roleId;

        return this;
    }

    pullData() {
        return Promise.map(_.where(this.usersToTrack, {posts: true}), (user) => {
            return request(`https://www.instagram.com/${user.id}/?__a=1`, {
                method: 'GET',
                headers: {
                    'accept': '*/*',
                    'accept-encoding': 'gzip, deflate, br',
                    'accept-language': 'en-US,en;q=0.9,lv;q=0.8',
                    'cache-control': 'no-cache',
                    'dnt': '1',
                    'pragma': 'no-cache',
                    'referer': `https://www.instagram.com/${user.id}/`,
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
                    'x-requested-with': 'XMLHttpRequest',
                },
                json: true,
                timeout: (30 * 1000),
                resolveWithFullResponse: true,
                gzip: true
            }).then((response) => {
                winston.debug(`${this.constructor.name} :: Response status code ${response.statusCode}`);

                var responseBody = response.body;

                try {
                    var username = responseBody.graphql.user.username;
                    var userAvatar = responseBody.graphql.user.profile_pic_url;

                    for (let value of responseBody.graphql.user.edge_owner_to_timeline_media.edges) {
                        var node = value.node;

                        let pushableData = {
                            user_id: node.owner.id,
                            user_name: username,
                            user_avatar: userAvatar,
                            entry_id: node.id + '_' + node.owner.id,
                            entry_link_id: node.shortcode,
                            entry_text: (node.edge_media_to_caption.edges.length > 0 ? node.edge_media_to_caption.edges[0].node.text : null),
                            entry_image: node.display_url,
                            entry_created_at: moment(node.taken_at_timestamp * 1000).utc().format('YYYY-MM-DD HH:mm:ss'),
                            isNewEntry: false
                        };

                        this.dataEntries.push(pushableData);

                        // Handle additional image/video entries if the post is a carousel
                        if (node.__typename === 'GraphSidecar'
                            && node.hasOwnProperty('edge_sidecar_to_children')
                            && node.edge_sidecar_to_children.edges.length > 1) {
                            // Skip first carousel entry
                            for(var i = 1; i < node.edge_sidecar_to_children.edges.length; i++) {
                                let sidecarPushableData = {...pushableData};

                                sidecarPushableData.entry_image = node.edge_sidecar_to_children.edges[i].node.display_url;
                                this.dataEntries.push(sidecarPushableData);
                            }
                        }

                    }
                } catch (err) {
                    winston.error(err);
                    winston.debug(response.body);
                    throw Error(`Instagram response body has something bad! HTTP Status Code: ${response.statusCode}`);
                }
            }).thenWait(5000);
        }, {concurrency: 1});
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} **${entry.user_name}** posted on Instagram`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
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