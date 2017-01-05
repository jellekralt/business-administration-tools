'use-strict'

const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp-promise');
const spawn = require('child_process').spawn;
const mailcomposer = require('mailcomposer');
const Promise = require('bluebird');
const chalk = require('chalk');
const Spinner = require('cli-spinner').Spinner;

const Sheet = require('./sheet');

const MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];

class AdminTools {

    constructor(options) {
        this.options = options;

        if (options.debug) {
            this.debug = options.debug;
        }
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

        let spinner = new Spinner(`%s Writing hoursheets to ${hourSheetPath}`);

        spinner.setSpinnerString(18);
        spinner.start();

        mkdirp(hourSheetPath).then(function() {

            Promise.all(options.sheets.map(function(sheetData) {
                
                return new Promise(function(resolve, reject) {

                    let templatePath = path.join(__dirname, '../templates', sheetData.templateFilename);
                    let sheet = new Sheet(Object.assign({
                        credentials: options.credentials
                    }, sheetData.metaData));
                    
                    sheet.read(templatePath).then(function() {
                        let exportFilename = sheetData.exportFilename
                            .replace('%monthName%', monthName)
                            .replace('%year%', year);

                        let filePath = path.join(hourSheetPath, exportFilename);

                        sheet.process({
                            year: year, 
                            month: month,
                            calendars: {
                                holidays: options.calendars.holidays
                            }
                        }).then(function() {
                            sheet.export(filePath).then(function() {
                                //spawn('open', [filePath]);

                                resolve(filePath);
                            });
                        });

                    });

                });
                
            })).then(function(files) {
                
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

                        spinner.stop(true);
                        console.log(chalk.yellow(`✓ Written hoursheets to ${hourSheetPath}`));
                        files.forEach((file) => console.log(chalk.yellow(`  ➟ Created ${file}`)));
                        
                        //spawn('open', [mailPath]);
                    });
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

exports = module.exports = AdminTools;