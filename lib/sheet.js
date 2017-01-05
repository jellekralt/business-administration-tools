const path = require('path');
const XlsxTemplate = require('xlsx-template');
const moment = require('moment');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const Calendar = require('./calendar');

/**
 * Hour Sheet
 * 
 * @class HourSheet
 */
class HourSheet {

    /**
     * Creates an instance of HourSheet.
     * 
     * @param {Object} options
     * 
     * @memberOf HourSheet
     */
    constructor(options) {
        this.options = options;

        this.daysOff = [];

        if (options.credentials) {
            this.cal = Calendar.init({
                credentials: options.credentials
            });
        }
    }

    
    /**
     * Reads a template file
     * 
     * @param {string} filename
     * @returns {Promise}
     * 
     * @memberOf HourSheet
     */
    read(filename) {
        var _this = this;

        return new Promise(function (resolve, reject) {
            fs.readFile(filename, function (err, data) {
                _this.dataOriginal = data;
                resolve(data);
            });
        });
    }

    /**
     * Processes the template
     * 
     * @param {Object} options
     * @returns
     * 
     * @memberOf HourSheet
     */
    process(options) {
        var _this = this;

        return this.loadDaysOff(options.calendars.holidays, options.year, options.month).then(function () {

            // Create a template
            var template = new XlsxTemplate(_this.dataOriginal);

            // Replacements take place on first sheet
            var sheetNumber = 1;

            var monthStart = moment({ year: options.year, month: options.month - 1, day: 0 });
            var monthEnd = monthStart.clone().endOf('month');

            // Set up some placeholder values matching the placeholders in the template
            var values = {
                name: _this.options.name,
                client: _this.options.client,
                project: _this.options.project,
                monthYear: monthStart.format('MMMM YYYY'),
                month: monthStart.format('MMMM'),
                year: monthStart.format('YYYY'),
                daysInMonth: monthStart.daysInMonth(),
                days: []
            };

            var day = monthStart.clone();

            for (var i = 0; i < monthStart.daysInMonth(); i++) {

                if (day.isBefore(monthEnd) && _this.isWorkDay(day)) {
                    values.days.push({ day: day.date(), hours: 8, from: '08:00', to: '16:00' });
                } else {
                    values.days.push({ day: day.date(), hours: '', from: '', to: '' });
                }

                day.add(1, 'days');
            }

            // Perform substitution
            template.substitute(sheetNumber, values);

            // Get binary data
            _this.dataProcessed = template.generate();
        });
    }

    /**
     * Loads the days off 
     * 
     * @param {string} calendarId - Google Calender ID
     * @param {number} year
     * @param {number} month
     * @returns {Promise}
     * 
     * @memberOf HourSheet
     */
    loadDaysOff(calendarId, year, month) {
        var _this = this;
        return this.cal.getDaysOff(calendarId, year, month).then((days) => {
            this.daysOff = days;

            return days;
        });
    }

    /**
     * Checks if a given day is a workday
     * 
     * @param {Object} day - Date 
     * @returns {Boolean}
     * 
     * @memberOf HourSheet
     */
    isWorkDay(day) {
        var dayOff = this.daysOff.filter(function (d) {
            return d.diff(day, 'days') === 0;
        });

        return (day.isoWeekday() <= 5 && !dayOff.length);
    }

    /**
     * Exports the sheet to a given path
     * 
     * @param {strint} filename
     * @returns {Promise}
     * 
     * @memberOf HourSheet
     */
    export(filename) {
        // TODO: Figure out why promisify doesnt work here
        return new Promise((resolve, reject) => {

            fs.writeFile(filename, this.dataProcessed || this.dataOriginal, 'binary', function (err) {
                if (err) {
                    return reject(err);
                } else {
                    return resolve();
                }
            });

        });
    }
}

module.exports = HourSheet;