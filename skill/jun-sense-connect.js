#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const target = path.join(__dirname, 'eva-mobile-locate.js');
const [, , command, ...rest] = process.argv;

if (!command || command === '--help' || command === '-h' || command === 'help') {
  process.stdout.write([
    'jun-sense-connect is deprecated. Use eva-mobile-locate instead.',
    '',
    'Compatible commands:',
    '  jun-sense-connect pair',
    '  jun-sense-connect status',
    '  jun-sense-connect read <uri>',
    '  jun-sense-connect list-resources',
    '',
    'Preferred command:',
    '  eva-mobile-locate <command>',
  ].join('\n'));
  process.stdout.write('\n');
  process.exit(0);
}

const result = spawnSync(process.execPath, [target, command, ...rest], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  process.stderr.write(`Failed to run eva-mobile-locate: ${result.error.message}\n`);
  process.exit(1);
}

process.exit(typeof result.status === 'number' ? result.status : 1);
