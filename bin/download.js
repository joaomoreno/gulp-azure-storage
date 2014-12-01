var download = require('../lib/download');
var es = require('event-stream');

var argv = require('optimist')
	.usage('Usage: $0 --account (account) --key (key) --container (container) [--prefix (prefix)]')
	.demand(['account', 'key', 'container'])
	.argv;

download(argv.account, argv.key, argv.container, argv.prefix || '').pipe(es.through(function (data) {
	console.log(data);
}));
