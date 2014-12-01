#!/usr/bin/env node

var upload = require('../lib/upload');

var argv = require('optimist')
	.usage('Usage: $0 --account (account) --key (key) --container (container) [--prefix (prefix)] (file1)...')
	.demand(['account', 'key', 'container'])
	.argv;

upload(argv.account, argv.key, argv.container, argv.prefix || '', argv._, function (err) {
	if (err) {
		console.error(err);
		process.exit(1);
	}
});
