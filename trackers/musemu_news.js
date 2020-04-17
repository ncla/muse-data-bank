"use strict";

var Tracker = require('./base');
var request = require('request-promise-native');
var moment = require('moment');
var rssParser = require('rss-parser');
const url = require('url');
var winston = require('winston');
let cheerio = require('cheerio');

class MuseNewsTracker extends Tracker {
    constructor(credentials, usersToTrack, roleId) {
        super(credentials, usersToTrack);

        this.dbTable = 'musemu_news';

        this.dbCheckAgainst = {
            entry_id: 'entry_id',
            // entry_created_at: 'entry_created_at'
        };

        this.columnsToInsert = ['entry_id', 'entry_text'];

        this.pingableRoleId = roleId;

        return this;
    }

    pullData() {
        // TODO in future: Fetch each news page for more rich embed
        return request({
            url: `http://www.muse.mu/news`,
            method: 'GET',
            timeout: (30 * 1000)
        }).then(r => {
            winston.debug(`${this.constructor.name} :: Response length ${r.length}`);

            let $ = cheerio.load(r);
            let items = $('#block-system-main .view-content .item-list ul li')

            items.each((i, v) => {
                var link = $(v).find('.thumbnailWrapper').attr('href');

                this.dataEntries.push({
                    entry_id: url.parse(link).path.replace('/news/', ''),
                    entry_text: `${$(v).find('.blogTitle').text().trim()}`,
                    entry_link: url.resolve('http://muse.mu', link),
                });
            });
        });
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} New news post added on muse.mu`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
                "url": `${entry.entry_link}`,
                "color": "0"
            }
        };
    }
}

module.exports = MuseNewsTracker;