"use strict";

var Tracker = require('./base');
var request = require('request-promise-native');
var moment = require('moment');
var rssParser = require('rss-parser');
const url = require('url');
var winston = require('winston');
let cheerio = require('cheerio');
let SocksProxyAgent = require('socks-proxy-agent');
const axios = require('axios').default;

class MuseNewsTracker extends Tracker {
    constructor(credentials, usersToTrack, roleId, proxy) {
        super(credentials, usersToTrack);

        this.dbTable = 'musemu_news';

        this.dbCheckAgainst = {
            entry_id: 'entry_id',
            // entry_created_at: 'entry_created_at'
        };

        this.columnsToInsert = ['entry_id', 'entry_text'];

        this.pingableRoleId = roleId;

        this.proxy = proxy;

        return this;
    }

    pullData() {
        const proxy = this.proxy.split(":");
        const httpsAgent = new SocksProxyAgent({host: proxy[0], port: proxy[1]});
        const axiosClient = axios.create(httpsAgent);

        // TODO in future: Fetch each news page for more rich embed
        return axiosClient({
            url: `http://www.muse.mu/news`,
            method: 'GET',
            timeout: (30 * 1000)
        }).then(response => {
            winston.debug(`${this.constructor.name} :: Response length ${response.data.length}`);

            let $ = cheerio.load(response.data);
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