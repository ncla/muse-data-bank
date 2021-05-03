"use strict";

var Tracker = require('./base');
const puppeteer = require('puppeteer');

class ShopSitemapMuseTracker extends Tracker {
    constructor(credentials, usersToTrack, roleId, proxy) {
        super(credentials, usersToTrack);

        this.usersToTrack = usersToTrack;

        this.credentials = credentials;

        this.dbTable = 'shop_sitemap_muse';

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

        await page.goto('https://store.muse.mu/sitemap.xml');

        const urls = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.opened > .line:first-child span:not(.html-tag)')).map(el => {
                return el.innerText;
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
            title: `${this.getRoleIdNotifyString()} New entry found in Muse Shop Sitemap`,
            embed: {
                "title": entry.url,
                "type": "rich",
                "url": `${entry.url}`,
            }
        };
    }
}

module.exports = ShopSitemapMuseTracker;