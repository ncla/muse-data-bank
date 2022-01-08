"use strict";

const Tracker = require('./base');
const puppeteer = require('puppeteer');
const winston = require('winston');

class ShopMuseCanadaTracker extends Tracker {
    constructor(credentials, usersToTrack, roleId, proxy) {
        super(credentials, usersToTrack);

        this.dbTable = 'shop_muse';

        this.dbCheckAgainst = {
            entry_id: 'entry_id'
        };

        this.columnsToInsert = ['entry_id', 'entry_text'];

        this.pingableRoleId = roleId;

        this.proxy = proxy;

        return this;
    }

    async pullData() {
        const startUrl = 'https://store.warnermusic.ca/collections/muse/'

        const browser = await puppeteer.launch();

        const page = await browser.newPage();

        let products = [];
        let categoryUrls = [];

        winston.debug(`${this.constructor.name} :: Navigating to ${startUrl}`);

        await page.goto(startUrl);

        categoryUrls = await this.parseHomeResponse(page);

        winston.debug(`${this.constructor.name} :: Found ${categoryUrls.length} categories`);

        for (const categoryUrl of categoryUrls) {
            winston.debug(`${this.constructor.name} :: Navigating to ${categoryUrl}`);

            await page.goto(categoryUrl);
            const parsedProducts = await this.parseCategoryResponse(page)

            winston.debug(`${this.constructor.name} :: Found ${parsedProducts.length} products`);

            products = products.concat(parsedProducts)
        }

        let keyedProducts = {};

        for (const product of products) {
            keyedProducts[product.entry_id] = product;
        }

        this.dataEntries = Object.values(keyedProducts)

        return this;
    }

    async parseHomeResponse(page) {
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.main-menu > li > a')).map(el => {
                return new URL(el.getAttribute('href'), 'https://store.warnermusic.ca/').href
            })
        });
    }

    async parseCategoryResponse(page) {
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.product-list > li')).map(el => {
                let image = null
                const styleAttr = el.querySelector('.image').getAttribute('style')

                if (styleAttr) {
                    const matchUrl = styleAttr.match(/background-image:url\((.+)\)/i)

                    if (matchUrl[1]) {
                        image = 'https:' + matchUrl[1]
                    }
                }

                return {
                    entry_id: ('(CA) ' + el.querySelector('figure[alt]').getAttribute('alt')).slice(0, 128), // meh
                    entry_text: el.querySelector('figure[alt]').getAttribute('alt'),
                    entry_link:  new URL(el.querySelector('a.product-item-title').getAttribute('href'), 'https://store.warnermusic.ca/').href,
                    entry_image_url: image
                };
            })
        });
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} New item on Muse Canada Shop`,
            embed: {
                "title": `${entry.entry_text} (CA Shop)`,
                "type": "rich",
                "url": `${entry.entry_link}`,
                "color": "0",
                "thumbnail": {
                    "url": entry.entry_image_url
                }
            }
        };
    }
}

module.exports = ShopMuseCanadaTracker;