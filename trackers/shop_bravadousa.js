"use strict";

var Tracker = require('./base');
var request = require('request');
var moment = require('moment');
const url = require('url');
let cheerio = require('cheerio');
var async = require('async');
var winston = require('winston');

class ShopBravadousaTracker extends Tracker {
    constructor(credentials, usersToTrack) {
        super(credentials, usersToTrack);

        this.dbTable = 'shop_bravadousa';

        this.dbCheckAgainst = {
            entry_id: 'entry_id'
        };

        this.columnsToInsert = ['entry_id', 'entry_text'];

        return this;
    }

    pullData() {
        return new Promise((resolve, reject) => {
            var q = async.queue((task, callback) => {
                console.log('Sending request', task);

                request({
                    url: task.url,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                    },
                    timeout: (30 * 1000)
                }, (error, response, body) => {
                    if (error) {
                        reject(error);
                    }

                    console.log(this.constructor.name + ' :: ' + response.request.href + ', Status: ' + response.statusCode);

                    var parsed = this.parseResponse(task, body);

                    q.push(parsed.tasks);

                    if (parsed.dataEntries.length) {
                        this.dataEntries = this.dataEntries.concat(parsed.dataEntries);
                    }

                    callback();
                });

            }, 5);

            q.drain = () => {
                console.log(this.constructor.name + ' :: All queue items have been processed');
                resolve();
            };

            q.push([{type: 'home', url: 'http://muse.shop.bravadousa.com/'}]);

        });
    }

    parseResponse(requestDetails, responseBody) {
        var tasks = [];
        var dataEntries = [];

        if (requestDetails.type === 'home') {
            let $ = cheerio.load(responseBody);

            $('ul.LeftTopNav > li.ParentMenu > a.ParentNav').each((i, v) => {
                tasks.push({
                    url: $(v).attr('href') + '&sort=&page=0',
                    type: 'category'
                });
            });
        }

        if (requestDetails.type === 'category') {
            let $ = cheerio.load(responseBody);

            $('li.ItemContainer').each((i, v) => {

                dataEntries.push({
                    entry_id: $(v).find('a.ProductLinkName').eq(0).attr('data-productid'),
                    entry_text: $(v).find('a.ProductLinkName').eq(0).attr('data-productname'),
                    entry_link: $(v).find('a[class^="ProductLink"]').eq(0).attr('href') || 'http://muse.shop.bravadousa.com/',
                    entry_image_url: $(v).find('img.ProductImage').eq(0).attr('src')
                });

            });
        }

        return {tasks: tasks, dataEntries: dataEntries};
    }

    composeNotificationMessage(entry) {
        return {
            title: `New item on muse.shop.bravadousa.com`,
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

module.exports = ShopBravadousaTracker;