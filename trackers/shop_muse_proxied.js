"use strict";

var Tracker = require('./base');
let cheerio = require('cheerio');
let SocksProxyAgent = require('socks-proxy-agent');
const axios = require('axios').default;
const requestHeaders = require('./helpers').requestHeaders
var winston = require('winston');

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
        const proxy = this.proxy.split(":");
        const httpsAgent = new SocksProxyAgent({host: proxy[0], port: proxy[1]});
        const axiosClient = axios.create(httpsAgent)

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

        for (const site of sites) {
            let categoryUrls = [];

            await axiosClient({
                method: 'get',
                url: site.url,
                headers: requestHeaders
            }).then(response => {
                categoryUrls = this.parseHomeResponse(response.data);
            })

            for (const categoryUrl of categoryUrls) {
                await axiosClient({
                    method: 'get',
                    url: categoryUrl,
                    headers: requestHeaders
                }).then(response => {
                    const parsed = this.parseCategoryResponse(response.data)
                    winston.debug(`${this.constructor.name} :: Items count ${parsed.length}, URL ${categoryUrl}`);
                    parsed.forEach(product => {
                        product.entry_shop_key = site.key
                        products.push(product)
                    })
                })
            }
        }

        let keyedProducts = {};

        for (const product of products) {
            keyedProducts[product.entry_id] = product;
        }

        this.dataEntries = Object.values(keyedProducts)

        return this
    }

    parseHomeResponse(response) {
        let $ = cheerio.load(response);

        let urls = [];

        $('ul#nav > li > a.level-top').each((i, v) => {
            urls.push($(v).attr('href') + '?limit=all');
        });

        return urls;
    }

    parseCategoryResponse(response) {
        let $ = cheerio.load(response);

        let data = [];

        $('li.item').each((i, v) => {
            data.push({
                entry_id: $(v).attr('data-product_id'),
                entry_text: $(v).find('a').eq(0).attr('title'),
                entry_link: $(v).find('a').eq(0).attr('href'),
                entry_image_url: $(v).find('a > img').eq(0).attr('src')
            });
        });

        return data;
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