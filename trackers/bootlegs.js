"use strict";

var Tracker = require('./base');
var fs = require('fs');
var moment = require('moment');
var winston = require('winston');
var request = require('request-promise-native');
let cheerio = require('cheerio');

request = request.defaults({jar: true});

class MuseBootlegsTracker extends Tracker
{
    constructor(credentials, usersToTrack, roleId) {
        super(credentials);

        this.dbTable = 'bootlegs';

        this.dbCheckAgainst = {
            entry_id: 'entry_id'
        };

        this.pingableRoleId = roleId;

        return this;
    }

    pullData() {
        var rTransform = function(body, response) {
            return {'response': response, 'body': body};
        };

        return request({
            url: 'https://www.musebootlegs.com/ajax/login.php',
            method: 'POST',
            formData: {
                action: 'login',
                loginbox_remember: 'true',
                loginbox_membername: this.credentials.username,
                loginbox_password: this.credentials.password
            },
            timeout: (30 * 1000),
            transform: rTransform
        }).then((data) => {
            winston.debug(this.constructor.name + ' :: ' + data.response.request.href + ', Status: ' + data.response.statusCode);

            return request({
                url: 'https://www.musebootlegs.com/?p=torrents&pid=10',
                method: 'POST',
                formData: {
                    'sortOptions[sortBy]': 'added',
                    'sortOptions[sortOrder]': 'desc'
                },
                timeout: (30 * 1000)
            });
        }).then((r) => {
            let $ = cheerio.load(r);

            var errorBox = $('#show_error');

            if (errorBox.length) {
                winston.error($(errorBox).text().trim());
            }

            $('#content > .torrent-box[id^="torrent_"]').each((i, v) => {
                this.dataEntries.push({
                    entry_id: $(v).attr('id').replace( /^\D+/g, ''),
                    entry_text: $(v).find('.newIndicator').text().trim(),
                    entry_link: $(v).find('.newIndicator a').attr('href'),
                    entry_image_url: $(v).find('.previewImage a').attr('href'),
                    isNewEntry: false
                });
            });
        });

    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} New bootleg on musebootlegs.com`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
                "url": `${entry.entry_link}`,
                "color": "3066993",
                "thumbnail": {
                    "url": entry.entry_image_url
                }
            }
        };
    }

}

module.exports = MuseBootlegsTracker;