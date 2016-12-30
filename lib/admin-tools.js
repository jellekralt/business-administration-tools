'use-strict'

const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const spawn = require('child_process').spawn;
const mailcomposer = require('mailcomposer');

const config = require('../config.json');
const Sheet = require('./sheet');

const MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];

class AdminTools {
    constructor(options) {
        
    }

    run(year, month) {
        let date = new Date(year + '-' + month + '-1');
        let monthName = MONTHS[date.getMonth()];
        let monthPadded = ('0' + (date.getMonth() + 1)).slice(-2);

        let hourSheetPath = `${config.hourSheetPath}/${year} ${monthPadded} - ${monthName}`;
        let declarationPath = `${config.declarationPath}/${year} ${monthPadded} - ${monthName}`;

        console.log('Writing hoursheets to ' + hourSheetPath);

        mkdirp(hourSheetPath, function(err) {

            if (err) throw err;

            config.sheets.forEach(function(sheetData) {

                let sheet = Sheet.init(Object.assign({
                    template: path.join(__dirname, '../templates', sheetData.templateFilename)
                }, sheetData.metaData), function() {
                    let exportFilename = sheetData.exportFilename
                        .replace('%monthName%', monthName)
                        .replace('%year%', year);

                    let filePath = path.join(hourSheetPath, exportFilename);

                    console.log('Writing ' + filePath);

                    sheet.process(year, month, function() {
                        sheet.export(filePath, function() {
                            spawn('open', [filePath]);
                        });
                    });

                });

            });

            let mailTemplateStream = fs.createReadStream(path.join(__dirname, '../templates', '***REMOVED***'));

            let mail = mailcomposer({
                from: '***REMOVED*** <***REMOVED***>',
                to: '***REMOVED***',
                subject: 'Urenverantwoording ' + monthName + ' 2016',
                html: mailTemplateStream,
                attachments: [{
                    filename: '***REMOVED***',
                    path: path.join(__dirname, '../templates', '***REMOVED***'),
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

        return this;
    }

}

exports = module.exports = {
    run: function(year, month) {
        return adminTools = new AdminTools().run(year, month);
    }
};