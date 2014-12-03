var azure = require('azure-storage');
var es = require('event-stream');
var File = require('vinyl');
var ProgressBar = require('progress');
var queue = require('queue');
var delayed = require('delayed-stream');

function collectEntries(service, opts, callback) {
	var entries = [];

	function loop(token) {
		service.listBlobsSegmentedWithPrefix(opts.container, opts.prefix, token, null, function (err, result) {
			if (err) { return callback(err); }

			entries.push.apply(entries, result.entries);

			if (result.continuationToken) {
				loop(result.continuationToken);
			} else {
				callback(null, entries);
			}
		});
	}

	loop(null);
}

module.exports = function (opts) {
	if (!opts.account) {
		throw new Error('Missing account option.');
	}

	if (!opts.key) {
		throw new Error('Missing key option.');
	}

	if (!opts.container) {
		throw new Error('Missing container option.');
	}

	opts.prefix = opts.prefix || '';

	var service = azure.createBlobService(opts.account, opts.key);

	return es.readable(function (count, callback) {
		var that = this;

		collectEntries(service, opts, function (err, entries) {
			if (err) { return callback(err); }

			var q = queue({ concurrency: 4, timeout: 1000 * 60 * 2 });

			var bar = new ProgressBar(opts.format || 'Downloading [:bar] :percent', { total: entries.length });
			bar.tick(0);

			entries.forEach(function (entry) {
				q.push(function (callback) {
					var stream = service.createReadStream(opts.container, entry.name);
					var delayedStream = delayed.create(stream, {
						maxDataSize: 1024 * 1024 * 5
					});
					delayedStream.on('error', callback);
					delayedStream.on('end', callback);

					that.emit('data', new File({
						cwd: '.',
						base: opts.prefix ? opts.prefix + '/' : '',
						path: entry.name,
						contents: delayedStream
					}));
				});
			});

			q.on('success', function () { bar.tick(); });
			q.on('error', function (err) { that.emit('error', err); });
			q.start(function () { that.emit('end'); })
		});
	});
};
