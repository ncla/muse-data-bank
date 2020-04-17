"use strict";

var Tracker = require('./base');
var request = require('request-promise-native');
var moment = require('moment');
var rssParser = require('rss-parser');
const url = require('url');
var winston = require('winston');
let cheerio = require('cheerio');

class MuseGigTracker extends Tracker {
    constructor(credentials, usersToTrack, roleId) {
        super(credentials, usersToTrack);

        this.dbTable = 'musemu_gigs';

        this.dbCheckAgainst = {
            entry_id: 'entry_id',
            entry_created_at: 'entry_created_at'
        };

        this.columnsToInsert = ['entry_id', 'entry_text', 'entry_created_at'];

        this.pingableRoleId = roleId;

        return this;
    }

    pullData() {
        const loop = async () => {
            let result = null;
            let page = 0;

            while (result !== true) {
                await request({
                    url: `http://www.muse.mu/tour?page=${page}`,
                    method: 'GET',
                    timeout: (30 * 1000)
                }).then(r => {
                    winston.debug(`${this.constructor.name} :: Response length ${r.length}`);

                    let $ = cheerio.load(r);
                    let items = $('.block-TOUR-DATES .view-content .item-list ul li');

                    winston.debug(`${this.constructor.name} :: Items count ${items.length}`);

                    items.each((i, v) => {
                        var link = $(v).find('.tourMoreInfoLink').attr('href');

                        this.dataEntries.push({
                            entry_id: url.parse(link).pathname.replace('/tour-date/', ''),
                            entry_text: `${$(v).find('.tourtitle').text().trim()}, ${$(v).find('.tourCity').text().trim()}`,
                            entry_link: url.resolve('https://muse.mu', link),
                            entry_created_at: moment($(v).find('.date-display-single').eq(0).attr('content')).format('YYYY-MM-DD HH:mm:ss'),
                        });
                    });

                    if (items.length === 0) {
                        result = true;
                    }
                });

                page++;
            }
        };

        return loop();
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} New gig added on muse.mu`,
            embed: {
                "title": entry.entry_text,
                "type": "rich",
                "url": `${entry.entry_link}`,
                "timestamp": entry.entry_created_at,
                "color": "0"
            }
        };
    }
}

module.exports = MuseGigTracker;