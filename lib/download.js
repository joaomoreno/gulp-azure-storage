var azure = require('azure-storage');
var es = require('event-stream');
var File = require('vinyl');
var ProgressBar = require('progress');
var queue = require('queue');
var delayed = require('delayed-stream');

function collectEntries(service, opts, callback) {
	var entries = [];

	function loop(token) {
		service.listBlobsSegmentedWithPrefix(opts.container, opts.prefix, token, { include: 'metadata' }, function (err, result) {
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

	if (!opts.container) {
		throw new Error('Missing container option.');
	}

	opts.prefix = opts.prefix || '';
	
	var service = opts.key
		? azure.createBlobService(opts.account, opts.key)
		: azure.createBlobServiceAnonymous('https://' + opts.account + '.blob.core.windows.net/');

	return es.readable(function (count, callback) {
		var that = this;

		collectEntries(service, opts, function (err, entries) {
			if (err) { return callback(err); }

			var q = queue({ concurrency: 4, timeout: 1000 * 60 * 2 });

			if (!opts.quiet) {
				var bar = new ProgressBar(opts.format || 'Downloading [:bar] :percent', { total: entries.length });
				bar.tick(0);
			}

			entries.forEach(function (entry) {
				if (opts.buffer) {
					q.push(function (callback) {
						var buffer = new Buffer(Number(entry.properties['content-length']));
						var position = 0;
						var stream = service.createReadStream(opts.container, entry.name);

						stream.on('error', callback);
						stream.on('data', function (chunk) {
							chunk.copy(buffer, position);
							position += chunk.length;
						});

						stream.on('end', function () {
							that.emit('data', new File({
								cwd: '.',
								base: opts.prefix ? opts.prefix + '/' : '',
								path: entry.name,
								contents: buffer,
								stat: { mode: Number(entry.metadata.fsmode) }
							}));

							callback();
						});
					});
				} else {
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
							contents: delayedStream,
							stat: { mode: Number(entry.metadata.fsmode) }
						}));
					});
				}
			});

			if (!opts.quiet) {
				q.on('success', function () { bar.tick(); });
			}
			
			q.on('error', function (err) { that.emit('error', err); });
			q.start(function () { that.emit('end'); })
		});
	});
};
