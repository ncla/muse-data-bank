"use strict";

var Tracker = require('./base');
var winston = require('winston');
const puppeteer = require('puppeteer');

class ShopMuseTracker extends Tracker {
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
        const sites = [
            {
                'url': 'https://store.muse.mu/eu/search/?q=',
                'key': 'EU',
            },
            // {
            //     'url': 'https://usstore.muse.mu/',
            //     'key': 'US'
            // }
        ];

        let products = [];

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        for (const site of sites) {
            await page.goto(site.url);

            winston.debug('Clicking show more button until button is no longer visible')

            while (await this.isShowMoreButtonVisible(page)) {
                winston.debug('Clicking..')
                await this.clickShowMoreButton(page)
                await new Promise(r => setTimeout(r, 1500))
            }

            winston.debug('Show more button no more visible')

            const productList = await this.parseSearchResults(page)

            productList.forEach(product => {
                product.entry_shop_key = site.key
                products.push(product)
            })
        }

        await browser.close();

        let keyedProducts = {};

        for (const product of products) {
            keyedProducts[product.entry_id] = product;
        }

        this.dataEntries = Object.values(keyedProducts)

        return this
    }

    async parseSearchResults(page) {
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.product-grid .product')).map(el => {
                return {
                    entry_id: el.getAttribute('data-pid'),
                    entry_text: el.querySelector('.pdp-link a.link').innerText.trim(),
                    entry_link: new URL(
                        el.querySelector('.pdp-link a.link').getAttribute('href'),
                        'https://store.muse.mu/'
                    ).href,
                    entry_image_url: el.querySelector('.tile-image').getAttribute('src')
                }
            })
        })
    }

    async isShowMoreButtonVisible(page) {
        return await page.evaluate(() => {
            return document.querySelector('.show-more button') !== null
        });
    }

    async clickShowMoreButton(page) {
        return await page.evaluate(() => {
            document.querySelector('.show-more button').click()
        })
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} New item on shop.muse.mu`,
            embed: {
                "title": `${entry.entry_text} (${entry.entry_shop_key} Shop)`,
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

module.exports = ShopMuseTracker;