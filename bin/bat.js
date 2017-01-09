#!/usr/bin/env node

'use strict'

const program = require('commander');
const pack = require('../package.json');

program
    .version(pack.version)
    .command('setup [part]', 'setup stuff')
    .command('run', 'search with optional query', {isDefault: true}).alias('r')
    .parse(process.argv);