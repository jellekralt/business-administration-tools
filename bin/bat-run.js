#!/usr/bin/env node

'use strict'

const program = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const Preferences = require('preferences');
const AdminTools = require('../lib/admin-tools');
const Conf = require('conf');
const Spinner = require('cli-spinner').Spinner;

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

if (prefs.setup) {

    inquirer.prompt([
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
    ]).then(function(answers) {

        let spinner = new Spinner(`%s Writing hoursheets to ${config.get('paths.hourSheets')}`);
        spinner.setSpinnerString(18);
        spinner.start();

        adminTools.run({
            year: answers.year, 
            month: answers.month,
            credentials: prefs.oAuthTokens,
            templatePath: `${prefs.path}/templates`,
            hourSheetPath: config.get('paths.hourSheets'),
            declarationPath: config.get('paths.declarations'),
            sheets: config.get('sheets'),
            calendars: config.get('calendars')
        }).then(function(files) {
            spinner.stop(true);
            console.log(chalk.yellow(`✓ Written hoursheets to ${config.get('paths.hourSheets')}`));
            files.forEach((file) => console.log(chalk.yellow(`  ➟ Created ${file}`)));
        });

    }).catch(function(err) {
        throw err;
    });

} else {
    console.log(chalk.red(`The setup hasn't been run yet`));
    console.log(chalk.red(`Please run ${chalk.white.bgGreen('"bat setup"')}`));
}
