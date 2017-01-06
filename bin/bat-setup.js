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
const Auth = require('../lib/auth');
const auth = new Auth();

const pathAnswers = ['configPath', 'exportPathHourSheets', 'exportPathDeclarations'];

let config;
let server
let spinner;

program
    .option('-f, --force', 'force installation')
    .parse(process.argv);

let pkgs = program.args;

let prefs = new Preferences('com.jellekralt.bat', {
    setup: false
});

/**
 * Flow
 */

// Ask user for initial questions
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
]).then((answers) => {
    
    // Create the paths
    let paths = Object.keys(answers).reduce((items, key) => pathAnswers.indexOf(key) > -1 ? items.push(answers[key]) && items : items, []);

    paths.push(`${answers.configPath}/templates`);
    
    return createDirectories(paths).then(() => {
        return answers;
    });

}).then((answers) => {
    return createConfig(answers.configPath, answers);
}).then(function(answers) {
    prefs.setup = true;

    return inquirer.prompt({
        type: 'confirm',
        name: 'useCalendar',
        message: 'Do you want to link your Google Calendar account?',
        default: true
    });
}).then(function(answers) {
    if (answers.useCalendar) {
        
        return startServer()
            .then(openBrowser)
            .then((code) => prefs.oAuthCode = code)
            .then((code) => auth.getToken(code))
            .then((tokens) => prefs.oAuthTokens = tokens)
            .then(stopLoader)
            .then(getCalendars)
            .then((calendars) => inquirer.prompt([
                {
                    type: 'list',
                    name: 'holidayCalendars',
                    message: 'Select one or more calendars for your days off',
                    choices: calendars.items.map((cal) => ({name: cal.summary, value: cal.id}))
                }
            ]))
            .then(() => config.set('calendars.holidays', answers.holidayCalendars))
            .catch(stopLoader);
        
    } else {
        return false;
    }
}).then(() => {
    console.log(chalk.yellow(`✓ Setup run successfully!`));
    process.exit();
}).catch(function(err) {
    throw err;
});;


/**
 * Functions
 */

function startServer() {
    return new Promise((resolve, reject) => {
        let deferred = defer();

        setLoader();
        server = http.createServer((req, res) => listen(req, res, deferred));
        server.listen(9999, () => {
            resolve(deferred);
        });

    });
}

function listen(req, res, deferred) {
    let parsedUrl = url.parse(req.url, true); // true to get query as object
    let qParams = parsedUrl.query;

    res.end('CoOol');
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

function openBrowser(deferred) {    
    opn(auth.getAuthUrl());
    
    return deferred.promise;
}

function setLoader() {
    spinner = new Spinner('%s Linking calendar account, check your browser...');
    spinner.setSpinnerString(18);
    spinner.start();
}

function stopLoader() {
    spinner.stop(true);
}

function getCalendars() {
    var cal = Calendar.init({
        credentials: prefs.oAuthTokens
    });

    return cal.getCalendars();
}

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

    return answers;
}


