var azure = require('azure-storage');
var es = require('event-stream');
var queue = require('queue');
var ProgressBar = require('progress');
var vfs = require('vinyl-fs');
var createReadStream = require('streamifier').createReadStream;
var mime = require('mime');

module.exports = function (opts) {
	if (!opts.account) {
		throw new Error('Missing account option.');
	}

	if (!opts.container) {
		throw new Error('Missing container option.');
	}
	var prefix = opts.prefix || '';
	var service = azure.createBlobService(opts.account, opts.key).withFilter(new azure.LinearRetryPolicyFilter());
	var q = queue({ concurrency: 4, timeout: 1000 * 60 * 2 });
	var count = 0;
	var stream = es.through(function(file) {
		var that = this;

		if (file.isDirectory()) {
			return;
		}

		q.push(function(cb) {
			var istream = file.isBuffer() ? createReadStream(file.contents) : file.contents;
			var ostream = service.createWriteStreamToBlockBlob(
				opts.container,
				prefix + file.relative,
				{ metadata: { fsmode: file.stat.mode }, contentType: mime.lookup(file.relative) },
				function(err) {
					if (err) { return cb(err); }

					that.push(file);
					cb();
				}
			);

			istream.pipe(ostream);
		});
	}, function () {
		var that = this;
		service.createContainerIfNotExists(opts.container, function (err) {
			if (err) { that.emit('error', err); }
			if (!opts.quiet && q.length > 0) {
				var bar = new ProgressBar('uploading [:bar] :percent', { total: q.length });
				bar.tick(0);
				q.on('success', function () {
					count++;
					bar.tick();
				});
			}
			q.on('error', function (err) { that.emit('error', err); });
			q.start(function () {
				if (!opts.quiet) {
					console.log(count + ' files uploaded.');
				}
				that.emit('end');
			});
		});
	});

	return stream;
};
