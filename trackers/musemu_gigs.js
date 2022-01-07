"use strict";

const Tracker = require('./base');
const moment = require('moment');
const winston = require('winston');
const puppeteer = require('puppeteer');

class MuseGigTracker extends Tracker {
    constructor(credentials, usersToTrack, roleId, proxy) {
        super(credentials, usersToTrack);

        this.dbTable = 'musemu_gigs';

        this.dbCheckAgainst = {
            entry_id: 'entry_id',
            entry_created_at: 'entry_created_at'
        };

        this.columnsToInsert = ['entry_id', 'entry_text', 'entry_created_at'];

        this.pingableRoleId = roleId;

        this.proxy = proxy;

        return this;
    }

    async pullData() {
        let reachedLastPage = false;
        let pageNumber = 0;

        const browser = await puppeteer.launch();

        const page = await browser.newPage();

        while (reachedLastPage === false) {
            const url = `https://www.muse.mu/tour?page=${pageNumber}`

            await page.goto(url);
    
            const gigs = await this.parseTourPageElements(page);
    
            gigs.map(data => {
                // Because we can't have moment instance in page context easily, we remap here in our apps context
                data.entry_created_at = moment(data.entry_created_at).format('YYYY-MM-DD HH:mm:ss')
                return data
            })

            winston.debug(`${this.constructor.name} :: Items count ${gigs.length}, URL ${url}`);

            this.dataEntries = this.dataEntries.concat(gigs);

            // Prevent too much DoS if the logic for determining last page is incorrect
            if (gigs.length === 0 || pageNumber === 10) {
                reachedLastPage = true;
                return;
            }

            pageNumber++;
        }

        return this;
    }

    async parseTourPageElements(page) {
        const selector = '.block-TOUR-DATES .view-content .item-list ul li';

        return await page.evaluate(selector => {
            return Array.from(document.querySelectorAll(selector)).map(el => {
                const link = el.querySelector('.tourMoreInfoLink').getAttribute('href');

                return {
                    // new instance of URL is run within the page context!
                    entry_id: new URL(link, 'https://muse.mu').pathname.replace('/tour-date/', ''),
                    entry_text: `${el.querySelector('.tourtitle').innerText.trim()}, ${el.querySelector('.tourCity').innerText.trim()}`,
                    entry_link: new URL(link, 'https://muse.mu').href,
                    entry_created_at: el.querySelector('.date-display-single').getAttribute('content'),
                }
            })
        }, selector);
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