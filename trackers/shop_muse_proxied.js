"use strict";

var Tracker = require('./base');
let cheerio = require('cheerio');
var async = require('async');
let SocksProxyAgent = require('socks-proxy-agent');
const axios = require('axios').default;

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

    pullData() {
        const proxy = this.proxy.split(":");
        const httpsAgent = new SocksProxyAgent({host: proxy[0], port: proxy[1]});
        const axiosClient = axios.create(httpsAgent)
        
        return new Promise((resolve, reject) => {
            var q = async.queue((task, callback) => {
                axiosClient({
                    method: 'get',
                    url: task.url,
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
                    var parsed = this.parseResponse(task, response.data);

                    q.push(parsed.tasks);

                    if (parsed.dataEntries.length) {
                        this.dataEntries = this.dataEntries.concat(parsed.dataEntries);
                    }

                    callback();
                })
            }, 5);

            q.drain = () => {
                console.log(this.constructor.name + ' :: All queue items have been processed');
                resolve();
            };

            q.push([{type: 'home', url: 'https://store.muse.mu/eu/'}]);

        });
    }

    parseResponse(requestDetails, responseBody) {
        var tasks = [];
        var dataEntries = [];

        if (requestDetails.type === 'home') {
            let $ = cheerio.load(responseBody);

            $('ul#nav > li > a.level-top').each((i, v) => {
                tasks.push({
                    url: $(v).attr('href') + '?limit=all',
                    type: 'category'
                });
            });
        }

        if (requestDetails.type === 'category') {
            let $ = cheerio.load(responseBody);

            $('li.item').each((i, v) => {

                // TODO: Key each entry with entry_id to avoid duplicates and errors of duplicate inserts (when initially ran)
                dataEntries.push({
                    entry_id: $(v).attr('data-product_id'),
                    entry_text: $(v).find('a').eq(0).attr('title'),
                    entry_link: $(v).find('a').eq(0).attr('href'),
                    entry_image_url: $(v).find('a > img').eq(0).attr('src')
                });

            });
        }

        return {tasks: tasks, dataEntries: dataEntries};
    }

    composeNotificationMessage(entry) {
        return {
            title: `${this.getRoleIdNotifyString()} New item on shop.muse.mu`,
            embed: {
                "title": entry.entry_text,
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