const googleapis = require('googleapis');
const moment = require('moment');
const Promise = require('bluebird');
const Preferences = require('preferences');
const google = require('googleapis');
const calendar = googleapis.calendar('v3');
const Auth = require('./auth');

class Calendar {

    constructor(options) {
        this.options = options;

        this.auth = new Auth();
        this.auth.setCredentials(this.options.credentials);
    }

    getCalendars() {
        return new Promise((resolve, reject) => {
            calendar.calendarList.list({
                auth: this.auth.oauth2Client
            }, function(err, data) {
                if (err) throw err;

                resolve(data);
            });
        });
    }

    getDaysOff(calendarId, year, month) {
        return new Promise((resolve, reject) => {
            var monthStart = moment({year:year, month:month-1, day:1});
            var monthEnd = monthStart.clone().endOf('month');

            // Insert group
            calendar.events.list({
                calendarId: calendarId,
                timeMin: monthStart.format(),
                timeMax: monthEnd.format(),
                auth: this.auth.oauth2Client
            }, function (err, data) {
                if (err) throw err;

                var daysOff = [];

                data.items.forEach(function(event) {
                    var eventFrom = moment(event.start.date);
                    var eventTo = moment(event.end.date) - 1;

                    for (var d = eventFrom; d.isBefore(eventTo); d.add(1, 'days')) {
                        daysOff.push(d.clone());
                    }
                });

                resolve(daysOff);
            });
        });



    }
}

function init(options) {
    return new Calendar(options);
}

module.exports.init = init;
