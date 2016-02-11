var path = require('path');

var Sheet = require('./lib/sheet');

var nuonHourSheet = Sheet.init({
    name: '***REMOVED***',
    template: path.join(__dirname, 'templates', 'hours-nuon.xlsx')
}, function() {

    console.log('this.dataOriginal', this.dataOriginal);

    nuonHourSheet.process(2016, 3, function() {
        nuonHourSheet.export(path.join(__dirname, 'export', '***REMOVED***'));
    });

});

var ***REMOVED***HourSheet = Sheet.init({
    name: '***REMOVED***',
    client: '***REMOVED***',
    project: '***REMOVED***',
    template: path.join(__dirname, 'templates', 'hours-internal.xlsx')
}, function() {

    ***REMOVED***HourSheet.process(2016, 3, function() {
        ***REMOVED***HourSheet.export(path.join(__dirname, 'export', 'export-hours-internal.xlsx'));
    });

});

