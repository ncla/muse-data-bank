"use strict";

var Tracker = require('./base');
const axios = require('axios').default;
var convertXml = require('xml-js');
let SocksProxyAgent = require('socks-proxy-agent');

class ShopSitemapMuseTrackerProxied extends Tracker {
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

    pullData() {
        const proxy = this.proxy.split(":");
        const httpsAgent = new SocksProxyAgent({host: proxy[0], port: proxy[1]});
        const axiosClient = axios.create(httpsAgent)

        return axiosClient({
            method: 'get',
            url: 'https://store.muse.mu/sitemap.xml',
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:77.0) Gecko/20100101 Firefox/77.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'TE': 'Trailers'
            }
        }).then(response => {
            let options = {
                compact: true,
                ignoreDeclaration: true,
                ignoreAttributes: true
            }

            let parsed = convertXml.xml2js(response.data, options);

            parsed.urlset.url.forEach(item => {
                this.dataEntries.push({
                    url: item.loc._text
                });
            });
        })
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

module.exports = ShopSitemapMuseTrackerProxied;