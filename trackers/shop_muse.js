"use strict";

var Tracker = require('./base');
var request = require('request');
var moment = require('moment');
const url = require('url');
let cheerio = require('cheerio');
var async = require('async');
var winston = require('winston');
var dedent = require('dedent-js');

class ShopMuseTracker extends Tracker {
    constructor(credentials, usersToTrack) {
        super(credentials, usersToTrack);

        this.dbTable = 'shop_muse';

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
                    method: 'GET'
                }, (error, response, body) => {
                    if (error) {
                        reject(error);
                    }

                    console.log(this.constructor.name + ' :: ' + response.request.href + ', Status: ' + response.statusCode);

                    var parsed = this.parseResponse(task, body);

                    q.push(parsed.tasks);

                    if (parsed.dataEntries.length) {
                        //console.log(parsed.dataEntries);

                        this.dataEntries = this.dataEntries.concat(parsed.dataEntries);
                    }

                    callback();
                    //resolve();
                });

            }, 5);

            q.drain = () => {
                console.log(this.constructor.name + ' :: All queue items have been processed');
                resolve();
            };

            q.push([{type: 'home', url: 'http://store.muse.mu/eu/'}]);

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
            title: `New item on shop.muse.mu`,
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

module.exports = ShopMuseTracker;