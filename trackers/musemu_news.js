"use strict";

var Tracker = require('./base');
var request = require('request');
var moment = require('moment');
var rssParser = require('rss-parser');
const url = require('url');
var winston = require('winston');

class MuseNewsTracker extends Tracker {
    constructor(credentials, usersToTrack) {
        super(credentials, usersToTrack);

        this.dbTable = 'musemu_news';

        this.dbCheckAgainst = {
            entry_id: 'entry_id',
            entry_created_at: 'entry_created_at'
        };

        this.columnsToInsert = ['entry_id', 'entry_text', 'entry_created_at'];

        return this;
    }

    pullData() {

        return new Promise((resolve, reject) => {
            request({
                'url': 'http://muse.mu/rss/news',
                'method': 'GET',
                timeout: (30 * 1000)
            }, (error, response, body) => {
                if (error) {
                    reject(error);
                }

                console.log(this.constructor.name + ' :: ' + response.request.href + ', Status: ' + response.statusCode);

                rssParser.parseString(body, (rssErr, rssResult) => {
                    if (rssErr) {
                        reject(rssErr);
                    }

                    rssResult.feed.entries.forEach((entry) => {

                        this.dataEntries.push({
                            entry_id: url.parse(entry.link).pathname.replace('news,', ''),
                            entry_text: entry.title,
                            entry_description: entry.content,
                            entry_link: entry.link,
                            entry_created_at: moment(entry.pubDate, 'ddd, DD MMM YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
                        });

                    });

                    resolve(rssResult);
                });

                resolve();
            });
        });

    }

    composeNotificationMessage(entry) {
        return {
            title: `New news post added on muse.mu`,
            embed: {
                "title": entry.entry_text,
                "description": entry.entry_description,
                "type": "rich",
                "url": `${entry.entry_link}`,
                "timestamp": entry.entry_created_at,
                "color": "0"
            }
        };
    }
}

module.exports = MuseNewsTracker;