var googleapis = require('googleapis');
var moment = require('moment');
var authData = require('../_keys/authData');

function Calendar(options) {
    this.options = options;
}

Calendar.prototype.connect = function(callback) {
    // Create JWT auth object
    var jwt = new googleapis.auth.JWT(
        authData.email,
        __dirname + '/../' + authData.keyFile,
        null,
        authData.scopes,
        authData.subject
    );

    // Authorize
    jwt.authorize(function (err, token) {
        if (err) { throw err; }

        callback(jwt, token, googleapis.calendar('v3'));
    });

};

Calendar.prototype.getDaysOff = function(year, month, callback) {

    this.connect(function(jwt, token, calendar) {

        var monthStart = moment({year:year, month:month-1, day:1});
        var monthEnd = monthStart.clone().endOf('month');

        // Insert group
        calendar.events.list({
            calendarId: '***REMOVED***',
            timeMin: monthStart.format(),
            timeMax: monthEnd.format(),
            auth: jwt
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

            callback(daysOff);

        });

    });

};

function init(options) {
    return new Calendar(options);
}

module.exports.init = init;
