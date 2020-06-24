"use strict";

var Tracker = require('./base');
const axios = require('axios').default;
var convertXml = require('xml-js');

class ShopSitemapMuseTracker extends Tracker {
    constructor(credentials, usersToTrack, roleId) {
        super(credentials, usersToTrack);

        this.usersToTrack = usersToTrack;

        this.credentials = credentials;

        this.dbTable = 'shop_sitemap_muse';

        this.dbCheckAgainst = {
            url: 'url',
        };

        this.columnsToInsert = ['url'];

        this.pingableRoleId = roleId;

        return this;
    }

    pullData() {
        return axios.get('https://store.muse.mu/sitemap.xml').then(response => {
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

module.exports = ShopSitemapMuseTracker;