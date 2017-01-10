#!/usr/bin/env node

'use strict'

const os = require('os');
const path = require('path');
const http = require('http');
const url = require('url');
const program = require('commander');
const Preferences = require('preferences');
const chalk = require('chalk');
const inquirer = require('inquirer');
const Spinner = require('cli-spinner').Spinner;
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const opn = require('opn');
const defaultConfig = require('../config.default.json');
const Conf = require('conf');
const Calendar = require('../lib/calendar');
const Auth = require('../lib/auth');
const auth = new Auth();

const defaultParts = ['paths', 'calendar'];
const pathFilter = ['configPath', 'exportPathHourSheets', 'exportPathDeclarations'];

let isPartialSetup = false;
let config;
let server
let spinner;

program
    .option('-f, --force', 'force installation')
    .parse(process.argv);

let parts = program.args;

let prefs = new Preferences('com.jellekralt.bat', {
    setup: false
});

if (parts.length > 0) {
    isPartialSetup = true;
} else {
    parts = defaultParts;
}

// Map parts
parts = defaultParts.concat(parts).reduce((total, part) => {
    total[part] = parts.indexOf(part) > -1;
    return total;
}, {});


/**
 * Flow
 */

Promise.coroutine(function *() {
    
    if (!prefs.path && !parts.paths) {
        return console.log(chalk.red(`You need to make sure you've run the entire setup before you can run parts of it`));
    }

    if (parts.paths) {

        let pathAnswers = yield inquirer.prompt([
            {
                type: 'input',
                name: 'configPath',
                message: 'Select a config path',
                default: function() {
                    return os.homedir() + '/.bat/'
                }
            },
            {
                type: 'input',
                name: 'exportPathHourSheets',
                message: 'Select an export path for your hour sheets',
                default: function() {
                    return os.homedir() + '/Documents/Hoursheets';
                }
            },
            {
                type: 'input',
                name: 'exportPathDeclarations',
                message: 'Select an export path for your declarations',
                default: function() {
                    return os.homedir() + '/Documents/Declarations';
                }
            }
        ]);

        // Filter out the paths
        let paths = Object.keys(pathAnswers).reduce((items, key) => pathFilter.indexOf(key) > -1 ? items.push(pathAnswers[key]) && items : items, []);
        paths.push(`${pathAnswers.configPath}/templates`);
        
        // Create the entered directories
        yield createDirectories(paths);

        // Create the config
        createConfig(pathAnswers.configPath);

        config.set('paths.hourSheets', pathAnswers.exportPathHourSheets);
        config.set('paths.declarations', pathAnswers.exportPathDeclarations);
        
    } else {
        createConfig(prefs.path);
    }

    if (parts.calendar) {
    
        // Ask for Google Calendar integration
        let useGoogleCalendar = yield inquirer.prompt([
            {
                type: 'confirm',
                name: 'useCalendar',
                message: 'Do you want to link your Google Calendar account?',
                default: true
            },
            {
                type: 'input',
                name: 'clientId',
                message: 'Enter your Google API Client ID',
                validate: function(value) {
                    return value !== '';
                },
                when: function (answers) {
                    return answers.useCalendar;
                }
            },
            {
                type: 'input',
                name: 'clientSecret',
                message: 'Enter your Google API Client Secret',
                validate: function(value) {
                    return value !== '';
                },
                when: function (answers) {
                    return answers.useCalendar;
                }
            }
        ]);

        if (useGoogleCalendar.useCalendar) {

            prefs.oAuthClient = {
                id: useGoogleCalendar.clientId,
                secret: useGoogleCalendar.clientSecret
            };

            auth.setClientData(useGoogleCalendar.clientId, useGoogleCalendar.clientSecret);

            setLoader();

            if (!prefs.oAuthTokens) {
                // Start local server
                let deferred = yield startServer();
                // Open the browser
                openBrowser(); 
                // Get the code from the browser request, store it in prefs
                let code = yield deferred.promise;
                prefs.oAuthCode = code;
                // Get an oauth token with the code, store it in prefs
                let tokens = yield auth.getToken(code);
                prefs.oAuthTokens = tokens;
            }

            // Fetch the calendars
            let calendars = yield getCalendars();
            // Stop the loader
            stopLoader();
            // Ask the user to pick a calendar
            let calendarAnswers = yield inquirer.prompt([
                {
                    type: 'list',
                    name: 'holidayCalendars',
                    message: 'Select one or more calendars for your days off',
                    choices: calendars.items.map((cal) => ({name: cal.summary, value: cal.id}))
                }
            ]);
            // Store the chosen calendar in the config
            config.set('calendars.holidays', calendarAnswers.holidayCalendars)

        } else if (!useGoogleCalendar.useCalendar) {
            // Clear the oauth token
            prefs.oAuthTokens = null;
            return false;
        }

    }

    if (parts.sheets) {
        let sheetFiles = yield getTemplateFiles(`${prefs.path}/templates`);

        console.log('sheetFiles', sheetFiles);
        
        
        let sheetConfig = yield Promise.mapSeries(sheetFiles, (file) => {
            return inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'useFile',
                    message: `Do you want to add '${file}' as a sheet template?`
                },
                {
                    type: 'input',
                    name: 'name',
                    message: 'Give this template a reference',
                    validate: function(value) {
                        return value !== '';
                    },
                    when: function (answers) {
                        return answers.useFile;
                    }
                },
                {
                    type: 'input',
                    name: 'exportFilename',
                    message: 'What should the exported filename be?',
                    default: function(answers) {
                        return `%year% %monthName% - ${answers.name}${path.extname(file)}`;
                    },
                    validate: function(value) {
                        return value !== '';
                    },
                    when: function (answers) {
                        return answers.useFile;
                    }
                },
                {
                    type: 'editor',
                    name: 'metaData',
                    message: 'Add your metadata in JSON format',
                    default: function(answers) {
                        return JSON.stringify({
                            name: 'Bobby Tables'
                        }, null, 4)
                    },
                    validate: function(value) {
                        let parsed = null;

                        try {
                            parsed = JSON.parse(value);
                        } catch(err) {

                        }

                        return parsed && typeof parsed === 'object';
                    },
                    when: function (answers) {
                        return answers.useFile;
                    }
                }
            ])
            .then((answers) => {
                let sheet = {};
                
                if (answers.useFile) {
                    sheet = {
                        name: answers.name,
                        templateFilename: file,
                        exportFilename: answers.exportFilename,
                        metaData: JSON.parse(answers.metaData)
                    }
                }

                return sheet;
            });
        });

        config.set('sheets', sheetConfig);
    }

    // Wrap up
    prefs.setup = true;
    console.log(chalk.yellow(`✓ Setup run successfully!`));
    process.exit();


})().catch(function(err) {
    stopLoader();
    console.error(err.stack);
    process.exit();
});




/**
 * Functions
 */

function startServer() {
    return new Promise((resolve, reject) => {
        let deferred = defer();

        server = http.createServer((req, res) => listen(req, res, deferred));
        server.listen(9999, () => {
            resolve(deferred);
        });

    });
}
 
function listen(req, res, deferred) {
    let parsedUrl = url.parse(req.url, true); // true to get query as object
    let qParams = parsedUrl.query;

    res.end(`
        <body>
            <h1>Token received</h1>
            <p>You can close this browser window now, and return to the console</p>
            <script>window.close();</script>
    `);
    server.close();    

    if (qParams.code) {
        deferred.resolve(qParams.code);
    } else {
        deferred.reject('No valid oAuth code passed');
    }

}

function defer() {
    var resolve, reject;
    var promise = new Promise(function() {
        resolve = arguments[0];
        reject = arguments[1];
    });
    return {
        resolve: resolve,
        reject: reject,
        promise: promise
    };
}

function promiseWhile(condition, action) {
    return new Promise(function (resolve, reject) {
        var loop = function (result) {
            if (!condition(result)) return resolve();
            return Promise.cast(action())
                .then(loop)
                .catch(function (e) {
                    reject(e);
                });
        };
        process.nextTick(loop);
    });
}

function openBrowser(deferred) {    
    opn(auth.getAuthUrl());
}

function setLoader() {
    spinner = new Spinner('%s Linking calendar account, check your browser...');
    spinner.setSpinnerString(18);
    spinner.start();
}

function stopLoader() {
    if (spinner) {
        spinner.stop(true);
    }
}

function getCalendars() {
    console.log('prefs.oAuthClient', prefs.oAuthClient);
    
    var cal = Calendar.init({
        credentials: prefs.oAuthTokens,
        oAuthClient: prefs.oAuthClient
    });

    return cal.getCalendars();
}

function createDirectories(paths) {
    paths = paths.map((path) => path.replace('~', os.homedir()));

    return Promise.all(paths.map((path) => fs.mkdirp(path)));
}

function createConfig(path) {
    config = new Conf({
        defaults: defaultConfig,
        configName: 'config',
        cwd: path
    });
}

function getTemplateFiles(path) {
    // TODO: Find out why promisify doesnt work
    return new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
}

