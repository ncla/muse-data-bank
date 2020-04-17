"use strict";

var Tracker = require('./base');
var moment = require('moment');
const url = require('url');
let cheerio = require('cheerio');
var async = require('async');
var winston = require('winston');
var _ = require('underscore');

var request = require('request-promise-native');

var cookieStore = require('tough-cookie-file-store');
var jar = request.jar(new cookieStore('./dime.json'));

var rTransform = function(body, response) {
    return {'response': response, 'body': body};
};

request = request.defaults({
    jar: jar,
    transform: rTransform
});

class DimeTracker extends Tracker {
    constructor(credentials, usersToTrack, roleId) {
        super(credentials, usersToTrack);

        this.dbTable = 'dime';

        this.dbCheckAgainst = {
            entry_id: 'entry_id'
        };

        this.columnsToInsert = ['entry_id', 'entry_text'];

        this.pingableRoleId = roleId;

        return this;
    }

    pullData() {
        return request({
            url: 'http://www.dimeadozen.org/torrents-browse.php',
            method: 'GET',
            followRedirect: false,
            timeout: (30 * 1000),
        }).then((data) => {
            console.log(this.constructor.name + ' :: ' + data.response.request.href + ', Status: ' + data.response.statusCode);

            this.parseData(data.body);
        }).catch((err) => {
            var headers = err.response.response.headers;
            if (err.statusCode === 302 && _.has(headers, 'location') && headers.location.indexOf('dimeadozen.org/account-login.php') !== -1) {
                winston.info('DIME requires authentication');

                return this.login().then((data) => {
                    this.parseData(data.body);
                });
            }
        });
    }

    login() {
        return request({
            url: 'http://www.dimeadozen.org/take-login.php',
            method: 'POST',
            followAllRedirects: true,
            formData: {
                returnto: 'torrents-browse.php',
                username: this.credentials.username,
                password: this.credentials.password
            }
        });
    }

    parseData(data) {
        let $ = cheerio.load(data);

        $('table.torrent tr:not(:first-child)').each((i, v) => {
            var entryText = $(v).find('a[href*="torrents-details.php?id="] strong').eq(0).text();

            if (entryText.match(/\bmuse\b/i) !== null) {
                this.dataEntries.push({
                    entry_id: url.parse($(v).find('a[href*="torrents-details.php?id="]').eq(0).attr('href'), true).query.id,
                    entry_text: entryText,
                    entry_link: 'http://www.dimeadozen.org/' + $(v).find('a[href*="torrents-details.php?id="]').eq(0).attr('href'),
                    isNewEntry: false
                });
            }
        });
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} New bootleg torrent on DIME`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
                "url": `${entry.entry_link}`,
                "color": "0"
            }
        };
    }

}

module.exports = DimeTracker;