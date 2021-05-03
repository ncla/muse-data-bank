"use strict";

var Tracker = require('./base');
var winston = require('winston');
const puppeteer = require('puppeteer');

class ShopMuseTrackerProxied extends Tracker {
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
                'url': 'https://store.muse.mu/eu/',
                'key': 'EU',
            },
            {
                'url': 'https://usstore.muse.mu/',
                'key': 'US'
            }
        ];

        let products = [];

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        for (const site of sites) {
            await page.goto(site.url);

            const categoryUrls = await this.parseHomeResponse(page);

            for (const categoryUrl of categoryUrls) {
                await page.goto(categoryUrl);

                const productList = await this.parseCategoryResponse(page);

                winston.debug(`${this.constructor.name} :: Items count ${productList.length}, URL ${categoryUrl}`);

                productList.forEach(product => {
                    product.entry_shop_key = site.key
                    products.push(product)
                })
            }
        }

        await browser.close();

        let keyedProducts = {};

        for (const product of products) {
            keyedProducts[product.entry_id] = product;
        }

        this.dataEntries = Object.values(keyedProducts)

        return this
    }

    async parseHomeResponse(page) {
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('ul#nav > li > a.level-top')).map(el => {
                return el.getAttribute('href') + '?limit=all';
            })
        });
    }

    async parseCategoryResponse(page) {
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('li.item')).map(el => {
                return {
                    entry_id: el.getAttribute('data-product_id'),
                    entry_text: el.querySelector('a').getAttribute('title'),
                    entry_link: el.querySelector('a').getAttribute('href'),
                    entry_image_url: el.querySelector('a > img').getAttribute('src')
                }
            })
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

module.exports = ShopMuseTrackerProxied;