"use strict";

var Tracker = require('./base');
var request = require('request');
var moment = require('moment');
var Client = require('instagram-private-api').V1;
var winston = require('winston');
var _ = require('underscore');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

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
        var igUserIdsApi = _.map(_.where(this.usersToTrack, {stories: true}), (user) => {
            return user.id_api;
        });

        if (igUserIdsApi.length === 0) {
            return Promise.reject('No users');
        }

        winston.debug(`${this.constructor.name} :: Calling shell to run PHP script`);

        return exec(`php instagram/Stories.php ${this.credentials.userName} ${this.credentials.password} ${igUserIdsApi.join(',')}`).then(std => {
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
            "type": "rich",
            "description": `${entry.entry_image}`,
            "timestamp": entry.entry_created_at,
            "color": "15844367",
        };

        if (entry.hasOwnProperty('entry_image')) {
            embedProperty['image'] = {
                "url": entry.entry_image
            };

            return {
                title: `**${entry.user_name}** posted a new item on Instagram Story`,
                embed: embedProperty
            };
        }

        if (entry.hasOwnProperty('entry_video')) {
            return {
                title: `**${entry.user_name}** posted a new item on Instagram Story\n\nDirect video link: ${entry.entry_video}`
            };
        }
    }
}

module.exports = InstagramStoriesTracker;