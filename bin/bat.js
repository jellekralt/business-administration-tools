#!/usr/bin/env node

'use strict'

const argv = require('minimist')(process.argv.slice(2));
const inquirer = require('inquirer');
const AdminTools = require('../lib/admin-tools');

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

inquirer.prompt(questions, function(answers) {
    console.log(answers);
    AdminTools.run(answers.year, answers.month);
});
