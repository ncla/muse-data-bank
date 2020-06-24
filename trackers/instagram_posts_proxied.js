"use strict";

var Tracker = require('./base');

class InstagramPostProxiedTracker extends Tracker {
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

    async pullData() {
        // WIP
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

module.exports = InstagramPostProxiedTracker;