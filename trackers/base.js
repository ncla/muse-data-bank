"use strict";

var NotifyManager = require('./../notify_manager');
var winston = require('winston');

class Tracker
{

    constructor(credentials) {
        this.credentials = credentials;

        this.dataEntries = [];

        this.columnsToInsert = ['user_id', 'user_name', 'entry_id', 'entry_text', 'entry_created_at'];

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

        var promises = [];

        this.dataEntries.forEach(function (currentValue, index) {
            var reMapped = {};

            // Re-mapping
            for (var dbColumnName in this.dbCheckAgainst) {
                if (this.dbCheckAgainst.hasOwnProperty(dbColumnName)) {
                    reMapped[dbColumnName] = currentValue[this.dbCheckAgainst[dbColumnName]];
                }
            }

            // console.log(this.dbCheckAgainst, currentValue, reMapped);

            var promise = knex.select().from(this.dbTable).where(reMapped).then((rows) => {
                    if (rows.length === 0) {
                        this.dataEntries[index]['isNewEntry'] = true;
                        NotifyManager.add(this.composeNotificationMessage(this.dataEntries[index]));
                        //console.log(this.dataEntries[index]);
                    } else {
                        //console.log('nononoonon', this.dataEntries[index]['entry_id']);
                    }
                }
            );

            promises.push(promise);
        }, this);

        return Promise.all(promises);
    }

    insertNewEntries(knex) {
        if (knex === undefined) {
            throw new Error('Knex not found');
        }

        if (this.dbTable === undefined) {
            throw new Error('Database table for data bank not specified');
        }

        winston.info(this.constructor.name + ' :: Inserting new entries');

        this.dataEntries.forEach((entryValue, entryIndex) => {
            if (entryValue.isNewEntry === true) {
                var reMapped = {};

                // Re-mapping
                this.columnsToInsert.forEach((colName) => {
                    if (entryValue.hasOwnProperty(colName)) {
                        reMapped[colName] = entryValue[colName];
                    }
                }, this);

                console.log(reMapped.entry_id);

                // We do not care to wait for the inserts to finish to continue with other stuff
                // TODO: Maybe change this behaviour?
                knex.insert(reMapped).returning('id').into(this.dbTable)
                    .then((id) => console.log(id))
                    .catch((err) => winston.error('DB Error', err));
            }
        }, this);

        return this;
    }

    composeNotificationMessage(entry) {
        delete entry['isNewEntry'];

        return JSON.stringify(entry);
    }

    updateDb() {
        this.compareWithDb();
        this.insertNewEntries();
    }

    notify() {
        return this;
    }

}

module.exports = Tracker;