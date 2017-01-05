#!/usr/bin/env node

'use strict'

const os = require('os');
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

var config;
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

var Auth = require('../lib/auth');
var auth = new Auth();


var oauth2Client = new OAuth2(
    '***REMOVED***',
    '***REMOVED***',
    'http://localhost:9999'
);

var scopes = [
  'https://www.googleapis.com/auth/calendar'
];

var server, spinner;

program
    .option('-f, --force', 'force installation')
    .parse(process.argv);

let pkgs = program.args;

let prefs = new Preferences('com.jellekralt.bat', {
    setup: false
});

const pathAnswers = ['configPath', 'exportPathHourSheets', 'exportPathDeclarations'];

function createDirectories(paths) {
    paths = paths.map((path) => path.replace('~', os.homedir()));

    return Promise.all(paths.map((path) => fs.mkdirp(path)));
}

function createConfig(path, answers) {
    config = new Conf({
        defaults: defaultConfig,
        configName: 'config',
        cwd: path
    });

    config.set('paths.hourSheets', answers.exportPathHourSheets);
    config.set('paths.declarations', answers.exportPathDeclarations);
    
    prefs.path = answers.configPath;
}

function linkCalendar() {
    server = http.createServer(handleCalendarOauth);

    var url = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',

        // If you only need one scope you can pass it as string
        scope: 'https://www.googleapis.com/auth/calendar'
    });

    setLoader();

    server.listen(9999, function() {
        //DEBUG: console.log('Temporary oAuth Server Listening on http://localhost:9999');
    });

    opn(url);
}

function setLoader() {
    spinner = new Spinner('%s Linking calendar account, check your browser...');
    spinner.setSpinnerString(18);
    spinner.start();
}

function handleCalendarOauth(req, res) {
    let parsedUrl = url.parse(req.url, true); // true to get query as object
    let qParams = parsedUrl.query;

    res.end('CoOol');
    server.close();

    if (qParams.code) {
        prefs.oAuthCode = qParams.code;

        auth.getToken(qParams.code).then(function(tokens) {
            prefs.oAuthTokens = tokens;

            spinner.stop(true);
            
            pickCalendars();
        });
        
    } else {
        spinner.stop(true);

        console.log(chalk.red('No valid oAuth code passed'));
    }

}


inquirer.prompt([
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
]).then(function(answers) {
    let paths = Object.keys(answers).reduce((items, key) => pathAnswers.indexOf(key) > -1 ? items.push(answers[key]) && items : items, []);    
    
    createDirectories(paths)
        .then(() => createConfig(answers.configPath, answers))
        .then(function() {
            prefs.setup = true;

            inquirer.prompt({
                type: 'confirm',
                name: 'useCalendar',
                message: 'Do you want to link your Google Calendar account?',
                default: true
            }).then(function(answers) {
                if (answers.useCalendar) {
                    linkCalendar();
                }
            })


        }).catch(function(err) {
            console.log('ERR: ' + err)
        });
});


function pickCalendars() {

    var cal = Calendar.init({
        credentials: prefs.oAuthTokens
    });

    cal.getCalendars(function(calendars) {

        inquirer.prompt([
            {
                type: 'list',
                name: 'holidayCalendars',
                message: 'Select one or more calendars for your days off',
                choices: calendars.items.map((cal) => ({name: cal.summary, value: cal.id}))
            }
        ]).then(function(answers) {
            
            config.set('calendars.holidays', answers.holidayCalendars);
            process.exit();

        });

    });
}
