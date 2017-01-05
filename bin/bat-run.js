#!/usr/bin/env node

'use strict'

const program = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const Preferences = require('preferences');
const AdminTools = require('../lib/admin-tools');
const Conf = require('conf');

let prefs = new Preferences('com.jellekralt.bat', {
    setup: false
});

let adminTools = new AdminTools({
    debug: true
});

const config = new Conf({
    configName: 'config',
    cwd: prefs.path
});

program
    .option('-f, --force', 'force run')
    .option('--debug', 'debug mode')
    .parse(process.argv);

const questions = [
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

if (prefs.setup) {

    inquirer.prompt(questions).then(function(answers) {

        adminTools.run({
            year: answers.year, 
            month: answers.month,
            credentials: prefs.oAuthTokens,
            templatePath: `${prefs.path}/templates`,
            hourSheetPath: config.get('paths.hourSheets'),
            declarationPath: config.get('paths.declarations'),
            sheets: config.get('sheets'),
            calendars: config.get('calendars')
        });

    }).catch(function(err) {
        throw err;
    });

} else {
    console.log(chalk.red(`The setup hasn't been run yet`));
    console.log(chalk.red(`Please run ${chalk.white.bgGreen('"bat setup"')}`));
}
