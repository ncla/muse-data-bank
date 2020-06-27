"use strict";

var Tracker = require('./base');
const axios = require('axios').default;
var convertXml = require('xml-js');
let SocksProxyAgent = require('socks-proxy-agent');
const Promise = require('bluebird');

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

    pullData() {
        const proxy = this.proxy.split(":");
        const httpsAgent = new SocksProxyAgent({host: proxy[0], port: proxy[1]});
        const axiosClient = axios.create(httpsAgent)
        const requestHeaders = {
            'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:77.0) Gecko/20100101 Firefox/77.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
            'TE': 'Trailers'
        };

        return axiosClient({
            method: 'get',
            url: 'https://www.muse.mu/sitemap.xml',
            headers: requestHeaders
        }).then(response => {
            let options = {
                compact: true,
                ignoreDeclaration: true,
                ignoreAttributes: true
            }

            let parsed = convertXml.xml2js(response.data, options);

            return Promise.map(parsed.sitemapindex.sitemap, (sitemap) => {
                return axiosClient({
                    method: 'get',
                    url: sitemap.loc._text,
                    headers: requestHeaders
                }).then(response => {
                    let parsed = convertXml.xml2js(response.data, options);

                    parsed.urlset.url.forEach(item => {
                        this.dataEntries.push({
                            url: item.loc._text
                        });
                    });
                })
            });
        })
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