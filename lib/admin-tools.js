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

        return mkdirp(hourSheetPath).then(() => Promise.all(options.sheets.map(function(sheetData) {
            
            return new Promise(function(resolve, reject) {

                let templatePath = path.join(options.templatePath, sheetData.templateFilename);
                let sheet = new Sheet(Object.assign({
                    credentials: options.credentials,
                    authClient: options.authClient
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
            
        })));
    }

}

exports = module.exports = AdminTools;