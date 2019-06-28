"use strict";

var Tracker = require('./base');
var request = require('request-promise-native');
var moment = require('moment');
var winston = require('winston');
const Promise = require('bluebird');
var Client = require('instagram-private-api').V1;
var _ = require('underscore');
var argv = require('yargs').argv;
const util = require('util');
const exec = util.promisify(require('child_process').exec);

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
        var igUserIdsApi = _.map(_.where(this.usersToTrack, {posts: true}), (user) => {
            return user.id_api;
        });

        if (igUserIdsApi.length === 0) {
            return Promise.reject('No users');
        }

        winston.debug(`${this.constructor.name} :: Calling shell to run PHP script`);

        return exec(`php instagram/Posts.php ${this.credentials.userName} ${this.credentials.password} ${igUserIdsApi.join(',')}`).then(std => {
            winston.debug(`${this.constructor.name} :: Shell response length - ${std.stdout.length}`);
            winston.debug(`${this.constructor.name} :: Shell response error - ${std.stderr}`);

            try {
                this.dataEntries = JSON.parse(std.stdout);
            } catch(e) {
                winston.debug(`${this.constructor.name} \n ${std.stdout.length}`);
                return Promise.reject(e);
            }

        });
    }

    composeNotificationMessage(entry) {
        var embedProperty = {
            "title": entry.entry_text,
            "type": "rich",
            "url": `https://www.instagram.com/p/${entry.entry_link_id}/`,
            "timestamp": entry.entry_created_at,
            "color": "15844367",
            "author": {
                "name": entry.user_name,
                "icon_url": entry.user_avatar
            }
        };

        if (entry.hasOwnProperty('entry_image')) {
            embedProperty['image'] = {
                "url": entry.entry_image
            };

            return {
                title: `**${entry.user_name}** posted on Instagram`,
                embed: embedProperty
            };
        }

        // Video support in embeds does not exist as of writing
        // https://support.discordapp.com/hc/en-us/community/posts/360037387352-Videos-in-Rich-Embeds
        // "For the webhook embed objects, you can set every field except ..video."
        // https://discordapp.com/developers/docs/resources/webhook#execute-webhook
        if (entry.hasOwnProperty('entry_video')) {
            return {
                title: `**${entry.user_name}** posted on Instagram <${embedProperty.url}>\n\nDirect video link: ${entry.entry_video}`
            };
        }
    }
}

module.exports = InstagramPostTracker;