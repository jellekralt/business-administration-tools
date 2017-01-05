'use-strict'

const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp-promise');
const spawn = require('child_process').spawn;
const mailcomposer = require('mailcomposer');
const Promise = require('bluebird');
const chalk = require('chalk');

const Sheet = require('./sheet');

const MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];

class AdminTools {

    constructor() {

    }


    run(options) {
        // TODO: Clean this up, check for req. options
        let year = options.year;
        let month = options.month;
        let date = new Date(year + '-' + month + '-1');
        let monthName = MONTHS[date.getMonth()];
        let monthPadded = ('0' + (date.getMonth() + 1)).slice(-2);

        let hourSheetPath = `${options.hourSheetPath}/${year} ${monthPadded} - ${monthName}`;
        let declarationPath = `${options.declarationPath}/${year} ${monthPadded} - ${monthName}`;

        console.log('Writing hoursheets to ' + hourSheetPath);

        mkdirp(hourSheetPath).then(function() {

            Promise.mapSeries(options.sheets, function(sheetData) {
                
                return new Promise(function(resolve, reject) {

                    let sheet = Sheet.init(Object.assign({
                        credentials: options.credentials,
                        template: path.join(__dirname, '../templates', sheetData.templateFilename)
                    }, sheetData.metaData), function() {
                        let exportFilename = sheetData.exportFilename
                            .replace('%monthName%', monthName)
                            .replace('%year%', year);

                        let filePath = path.join(hourSheetPath, exportFilename);

                        console.log('Writing ' + filePath);

                        sheet.process({
                            year: year, 
                            month: month,
                            calendars: {
                                holidays: options.calendars.holidays
                            }
                        }, function() {
                            sheet.export(filePath, function() {
                                //spawn('open', [filePath]);

                                resolve();
                            });
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

                    //spawn('open', [mailPath]);
                });
            });


        }).catch(function (err) {
            throw err;
        });

        mkdirp(declarationPath).catch(function(err) {
            throw err;
        });

        return this;
    }

}

exports = module.exports = {
    run: function(options) {
        return adminTools = new AdminTools().run(options);
    }
};