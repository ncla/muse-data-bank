"use strict";

var Tracker = require('./base');
const axios = require('axios').default;
var convertXml = require('xml-js');
let SocksProxyAgent = require('socks-proxy-agent');
const Promise = require('bluebird');
const puppeteer = require('puppeteer');

class MuseSitemapTracker extends Tracker {
    constructor(credentials, usersToTrack, roleId, proxy) {
        super(credentials, usersToTrack);

        this.usersToTrack = usersToTrack;

        this.credentials = credentials;

        this.dbTable = 'musemu_sitemap';

        this.dbCheckAgainst = {
            url: 'url',
        };

        this.columnsToInsert = ['url'];

        this.pingableRoleId = roleId;

        this.proxy = proxy;

        return this;
    }

    async pullData() {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto('https://www.muse.mu/sitemap.xml');

        const urls = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table a')).map(el => {
                return el.getAttribute('href')
            })
        })

        await browser.close();

        this.dataEntries = urls.map(url => {
            return {
                url: url
            }
        })

        return this;
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} New entry found in Muse.mu Sitemap`,
            embed: {
                "title": entry.url,
                "type": "rich",
                "url": `${entry.url}`,
            }
        };
    }
}

module.exports = MuseSitemapTracker;