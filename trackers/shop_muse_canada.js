"use strict";

var Tracker = require('./base');
let cheerio = require('cheerio');
let SocksProxyAgent = require('socks-proxy-agent');
const axios = require('axios').default;
const requestHeaders = require('./helpers').requestHeaders
var winston = require('winston');
const url = require('url');

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
        const proxy = this.proxy.split(":");
        const httpsAgent = new SocksProxyAgent({host: proxy[0], port: proxy[1]});
        const axiosClient = axios.create(httpsAgent)

        let products = [];
        let categoryUrls = [];

        delete requestHeaders['Accept-Encoding']

        await axiosClient({
            method: 'get',
            url: 'https://store.warnermusic.ca/collections/muse/',
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
                products = products.concat(parsed)
            })
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

        $('.main-menu > li > a').each((i, v) => {
            urls.push(url.resolve('https://store.warnermusic.ca/', $(v).attr('href')));
        });

        return urls;
    }

    parseCategoryResponse(response) {
        let $ = cheerio.load(response);

        let data = [];

        $('.product-list > li').each((i, v) => {
            let image = null
            const styleAttr = $(v).find('.image').eq(0).attr('style')

            if (styleAttr) {
                const matchUrl = styleAttr.match(/background-image:url\((.+)\)/i)

                if (matchUrl[1]) {
                    image = 'https:' + matchUrl[1]
                }
            }

            data.push({
                entry_id: ('(CA) ' + $(v).find('figure[alt]').eq(0).attr('alt')).slice(0, 128), // meh
                entry_text: $(v).find('figure[alt]').eq(0).attr('alt'),
                entry_link: url.resolve('https://store.warnermusic.ca/', $(v).find('a.product-item-title').eq(0).attr('href')),
                entry_image_url: image
            });
        });

        return data;
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