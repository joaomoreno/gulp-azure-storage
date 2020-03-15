#!/usr/bin/env node

var upload = require('../lib/upload');
var vfs = require('vinyl-fs');

var argv = require('yargs')
	.usage('Usage: $0 --account (account) --key (key) --container (container) [--prefix (prefix)] (file1)...')
	.demandOption(['account', 'key', 'container'])
	.argv;

vfs.src(argv._, { base: process.cwd() })
	.pipe(upload({
		account: argv.account,
		key: argv.key,
		container: argv.container,
		prefix: argv.prefix
	}))
	.on('error', function (err) {
		console.error(err);
		process.exit(1);
	});
