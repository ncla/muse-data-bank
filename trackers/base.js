"use strict";

var NotifyManager = require('./../notify_manager');
var winston = require('winston');
var Promise = require("bluebird");

class Tracker
{
    constructor(credentials) {
        this.credentials = credentials;

        this.dataEntries = [];

        this.columnsToInsert = ['user_id', 'user_name', 'entry_id', 'entry_text', 'entry_created_at'];

        this.pingableRoleId = null;

        return this;
    }

    pullData() {
        return this;
    }

    compareWithDb(knex) {
        if (knex === undefined) {
            throw new Error('Knex not found');
        }

        if (this.dbTable === undefined) {
            throw new Error('Database table for data bank not specified');
        }

        winston.info(this.constructor.name + ' :: Checking for new entries');
        
        return Promise.map(this.dataEntries, (entryValue, entryIndex) => {
            var reMapped = {};

            // Re-mapping
            for (var dbColumnName in this.dbCheckAgainst) {
                if (this.dbCheckAgainst.hasOwnProperty(dbColumnName)) {
                    reMapped[dbColumnName] = entryValue[this.dbCheckAgainst[dbColumnName]];
                }
            }

            return knex.select().from(this.dbTable).where(reMapped).then((rows) => {
                    if (rows.length === 0) {
                        this.dataEntries[entryIndex]['isNewEntry'] = true;
                        NotifyManager.add(this.composeNotificationMessage(this.dataEntries[entryIndex]));
                    }
                }
            );
        });
    }

    insertNewEntries(knex) {
        if (knex === undefined) {
            throw new Error('Knex not found');
        }

        if (this.dbTable === undefined) {
            throw new Error('Database table for data bank not specified');
        }

        winston.info(this.constructor.name + ' :: Inserting new entries');

        return Promise.map(this.dataEntries, (entryValue, entryIndex) => {
            if (entryValue.isNewEntry === true) {
                var reMapped = {};

                // Re-mapping
                this.columnsToInsert.forEach((colName) => {
                    if (entryValue.hasOwnProperty(colName)) {
                        reMapped[colName] = entryValue[colName];
                    }
                }, this);

                return knex.insert(reMapped).into(this.dbTable)
                    .catch((err) => winston.error('DB Error', err, err.stack));
            } else {
                return Promise.resolve();
            }
        });
    }

    composeNotificationMessage(entry) {
        delete entry['isNewEntry'];

        return JSON.stringify(entry);
    }

    updateDb() {
        return this.compareWithDb().then(() => {return this.insertNewEntries()});
    }

    notify() {
        return this;
    }

    getRoleIdNotifyString() {
        return this.pingableRoleId ? `<@&${this.pingableRoleId}>` : '';
    }
}

module.exports = Tracker;