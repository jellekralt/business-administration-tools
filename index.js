const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const mkdirp = require('mkdirp');
const spawn = require('child_process').spawn;
const mailcomposer = require('mailcomposer');

const config = require('./config.json');
var Sheet = require('./lib/sheet');

var MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];

var questions = [
    {
        type: 'input',
        name: 'month',
        message: 'Select a month (1-12)',
        default: function () { return new Date().getMonth() + 1; }
    },
    {
        type: 'input',
        name: 'year',
        message: 'Select a year',
        default: function () { return new Date().getFullYear(); }
    }
];


inquirer.prompt(questions, function( answers ) {

    var date = new Date(answers.year + '-' + answers.month + '-1');
    var monthName = MONTHS[date.getMonth()];
    var monthPadded = ('0' + (date.getMonth() + 1)).slice(-2);

    var hourSheetPath = config.hourSheetPath + '/' + answers.year + ' ' + monthPadded + ' - ' + monthName;
    var declarationPath = config.declarationPath + '/' + answers.year + ' ' + monthPadded + ' - ' + monthName;

    console.log('Writing hoursheets to ' + hourSheetPath);

    mkdirp(hourSheetPath, function(err) {

        if (err) throw err;

        config.sheets.forEach(function(sheetData) {

            let sheet = Sheet.init({
                name: '***REMOVED***',
                client: '***REMOVED***',
                project: '***REMOVED***',
                template: path.join(__dirname, 'templates', sheetData.templateFilename)
            }, function() {
                let exportFilename = sheetData.exportFilename
                    .replace('%monthName%', monthName)
                    .replace('%year%', answers.year);

                let filePath = path.join(hourSheetPath, exportFilename);

                console.log('Writing ' + filePath);

                sheet.process(answers.year, answers.month, function() {
                    sheet.export(filePath, function() {
                        spawn('open', [filePath]);
                    });
                });

            });

        });

        var mailTemplateStream = fs.createReadStream(path.join(__dirname, 'templates', '***REMOVED***'));

        var mail = mailcomposer({
            from: '***REMOVED*** <***REMOVED***>',
            to: '***REMOVED***',
            subject: 'Urenverantwoording ' + monthName + ' 2016',
            html: mailTemplateStream,
            attachments: [{
                filename: '***REMOVED***',
                path: path.join(__dirname, 'templates', '***REMOVED***'),
                cid: '***REMOVED***' //same cid value as in the html img src
            }]
        });

        mail.build(function(err, message){
            var mailPath = path.join(hourSheetPath, 'Email to ***REMOVED***.eml');

            return fs.writeFile(mailPath, message, 'binary', function(err){
                if(err) throw(err);

                spawn('open', [mailPath]);
            });
        });


    });

    mkdirp(declarationPath, function(err) {
        if (err) throw err;
    });

});


