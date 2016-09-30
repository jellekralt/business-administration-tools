var fs = require('fs');
var path = require('path');
var XlsxTemplate = require('xlsx-template');
var moment = require('moment');
var Calendar = require('./calendar');

var cal = Calendar.init();

function HourSheet(options, callback) {
    this.options = options;

    this.daysOff = [];

    if (options.template && callback) {
         this.read(options.template, callback);
    }
}

HourSheet.prototype.read = function(filename, callback) {
    var _this = this;

    fs.readFile(filename, function(err, data) {
        _this.dataOriginal = data;
        callback(data);
    });
};

HourSheet.prototype.process = function (year, month, callback) {
    var _this = this;

    this.loadDaysOff(year, month, function() {

        // Create a template
        var template = new XlsxTemplate(_this.dataOriginal);

        // Replacements take place on first sheet
        var sheetNumber = 1;

        var monthStart = moment({year:year, month:month-1, day:0});
        var monthEnd = monthStart.clone().endOf('month');

        // Set up some placeholder values matching the placeholders in the template
        var values = {
            name: _this.options.name,
            client: _this.options.client,
            project: _this.options.project,
            monthYear: monthStart.format('MMMM YYYY'),
            month: monthStart.format('MMMM'),
            year: monthStart.format('YYYY'),
            days: []
        };

        var day = monthStart.clone();

        for (var i = 0; i<31; i++) {

            if (day.isBefore(monthEnd) && _this.isWorkDay(day)) {
                values.days.push({day: day.date(), hours: 8, from: '08:00', to: '16:00'});
            } else {
                values.days.push({day: day.date(), hours: '', from: '', to: ''});
            }

            day.add(1, 'days');
        }

        // Perform substitution
        template.substitute(sheetNumber, values);

        // Get binary data
        _this.dataProcessed = template.generate();

        callback();

    });
};

HourSheet.prototype.loadDaysOff = function(year, month, callback) {
    var _this = this;

    cal.getDaysOff(year, month, function(days) {
        _this.daysOff = days;

        callback();
    });
};

HourSheet.prototype.isWorkDay = function (day) {
    var dayOff = this.daysOff.filter(function(d) {
        return d.diff(day, 'days') === 0;
    });

    return (day.isoWeekday() <= 5 && !dayOff.length);
};

HourSheet.prototype.export = function (filename, cb) {

    return fs.writeFile(filename, this.dataProcessed || this.dataOriginal, 'binary', function(err){
        if(err) throw(err);

        cb();
    });

};

function init(options, callback) {
    return new HourSheet(options, callback);
}

module.exports.init = init;
