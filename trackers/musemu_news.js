"use strict";

var Tracker = require('./base');
var winston = require('winston');
const puppeteer = require('puppeteer');

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

    async pullData() {
        const url = 'https://www.muse.mu/news'

        const browser = await puppeteer.launch();

        const page = await browser.newPage();

        await page.goto(url);

        const news = await this.parseNewsPageElements(page);

        winston.debug(`${this.constructor.name} :: Items count ${news.length}, URL ${url}`);

        this.dataEntries = news

        return this
    }

    async parseNewsPageElements(page) {
        const selector = '#block-system-main .view-content .item-list ul li';

        return await page.evaluate(selector => {
            return Array.from(document.querySelectorAll(selector)).map(el => {
                const link = el.querySelector('.thumbnailWrapper').getAttribute('href');

                return {
                    // new instance of URL is run within the page context!
                    entry_id: new URL(link, 'https://muse.mu').pathname.replace('/news/', ''),
                    entry_text: `${el.querySelector('.blogTitle').innerText.trim()}`,
                    entry_link: new URL(link, 'https://muse.mu').href,
                }
            })
        }, selector);
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