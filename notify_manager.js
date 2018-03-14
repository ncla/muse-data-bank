"use strict";

var request = require('request-promise-native');
var winston = require('winston');
const Promise = require('bluebird');
var dotenv = require('dotenv').config();
var env = process.env;
var promiseRetry = require('promise-retry');

class NotifyManager {

    constructor() {
        this.notifications = [];

        return this;
    }

    add(notification) {

        this.notifications.push(notification);

        return this;

    }

    /**
     * Discord doesn't want you to hard-code rate-limits into your application, they tell you to read the X-Ratelimit
     * headers and act accordingly to them. We send them one by one (Promise mapped notifications with one concurrent item),
     * send them fast as possible, when a X-Ratelimit remaining is 0, we wait till X-Ratelimit-Reset happens. This end-point
     * rate-limit bucket (as of 06/09/2017) is 5 requests/2 seconds. Unfortunately (as of 06/09/2017), there is another
     * bucket that is a global one with 30requests/60seconds. This does not get reflected in X-Ratelimit headers, only
     * in Retry-After header, so we have wrapped request sending in a retry-able Promise.
     *
     * https://github.com/izy521/discord.io/blob/master/docs/colors.md
     * https://discordapp.com/developers/docs/topics/rate-limits
     * https://github.com/hammerandchisel/discord-api-docs/issues/367
     */
    notify() {
        if (this.notifications.length === 0) {
            winston.info(this.constructor.name + ' :: No notifications to report, not sending web-hook');

            return;
        }

        winston.info(this.constructor.name + ' :: Sending notify through a web-hook');

        var delay = 0;

        return Promise.map(this.notifications, (notification) => {
            winston.debug(`Applying ${delay}ms delay`);

            return Promise.delay(delay).then(() => {
                if (notification.embed.description) {
                    notification.embed.description = (notification.embed.description.length > 1000 ? notification.embed.description.substring(0, 1000) + '...' : notification.embed.description);
                }

                if (notification.embed.title) {
                    notification.embed.title = (notification.embed.title.length > 250 ? notification.embed.title.substring(0, 250) + '...' : notification.embed.title);
                }

                return promiseRetry(function (retry, number) {
                    winston.debug(`Retryable promise attempt number ${number}`);

                    return request({
                            url: `https://discordapp.com/api/webhooks/${env.DISCORD_WEBHOOK_ID}/${env.DISCORD_WEBHOOK_TOKEN}`,
                            method: 'POST',
                            json: true,
                            resolveWithFullResponse: true,
                            body: {
                                content: notification.title,
                                embeds: [notification.embed]
                            }
                        }
                    ).then((resp) => {
                        var headers = resp.headers;
                        var diff = (headers['x-ratelimit-reset'] * 1000) - (new Date).getTime();
                        winston.debug(`Server time: ${headers['date']}, RL remain: ${headers['x-ratelimit-remaining']}, RL reset: ${(headers['x-ratelimit-reset'] * 1000)}, Time now: ${(new Date).getTime()}, Diff: ${diff}`);

                        delay = headers['x-ratelimit-remaining'] == 0 ? diff + 1000 : delay = 0;
                    }).catch((err) => {
                        var headers = err.response.headers;

                        if (err.response.statusCode === 429) {
                            var diff = (headers['x-ratelimit-reset'] * 1000) - (new Date).getTime();
                            winston.debug(`Server time: ${headers['date']}, RL remain: ${headers['x-ratelimit-remaining']}, RL reset: ${(headers['x-ratelimit-reset'] * 1000)}, Time now: ${(new Date).getTime()}, Diff: ${diff}, Retry after: ${headers['retry-after']}`);
                            winston.debug(`Global rate-limit reached, retrying in ${headers['retry-after']}ms`);
                            delay = 0;
                            return Promise.delay(headers['retry-after'] || 500).then(retry);
                        } else {
                            winston.error('Unhandled error response status code');
                            winston.debug(notification);
                            return Promise.delay(1000);
                        }
                    });

                });

            });

        }, {concurrency: 1});
    }

}

module.exports = new NotifyManager();