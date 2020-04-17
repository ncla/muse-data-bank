"use strict";

var Tracker = require('./base');
var request = require('request');
var moment = require('moment');
var winston = require('winston');
var _ = require('underscore');
var Promise = require("bluebird");
const util = require('util');
const exec = util.promisify(require('child_process').exec);

class InstagramFollowingTracker extends Tracker {
    constructor(credentials, usersToTrack) {
        super(credentials, usersToTrack);

        this.usersToTrack = usersToTrack;

        this.credentials = credentials;

        this.dbTable = 'instagram_following';

        this.dbCheckAgainst = {
            user_id: 'user_id',
            entry_id: 'entry_id'
        };

        return this;
    }

    pullData() {
        var igUserIdsApi = _.map(_.where(this.usersToTrack, {following: true}), (user) => {
            return user.id_api;
        });

        var usersIndexedByApiId = _.indexBy(this.usersToTrack, 'id_api');

        if (igUserIdsApi.length === 0) {
            return Promise.reject('No users');
        }

        winston.debug(`${this.constructor.name} :: Calling shell to run PHP script`);

        return exec(
            `php instagram/Following.php ${this.credentials.userName} ${this.credentials.password} ${igUserIdsApi.join(',')}`,
            {
                maxBuffer: 1024 * 500
            }
        ).then(std => {
            winston.debug(`${this.constructor.name} :: Shell response length - ${std.stdout.length}`);
            winston.debug(`${this.constructor.name} :: Shell response error - ${std.stderr}`);


            try {
                this.dataEntries = JSON.parse(std.stdout);
            } catch(e) {
                winston.debug(`${this.constructor.name} \n ${std.stdout.length}`);
                return Promise.reject(e);
            }

            // Instagram API doesn't return user_name of the person that is following these users
            this.dataEntries.forEach((following, followingIndex) => {
                this.dataEntries[followingIndex]['user_name'] = usersIndexedByApiId[following['user_id']]['id']
            });
        });
    }

    composeNotificationMessage(entry) {
        return {
            title: `**${entry.user_name}** followed an account on Instagram`,
            embed: {
                "type": "rich",
                "description": `[${entry.entry_user_fullname}](https://instagram.com/${entry.entry_username})`,
                "timestamp": entry.entry_created_at,
                "color": "15844367",
                "thumbnail": {
                    "url": entry.entry_user_avatar
                }
            }
        };
    }
}

module.exports = InstagramFollowingTracker;