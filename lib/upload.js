var azure = require('azure-storage');
var es = require('event-stream');
var queue = require('queue');
var ProgressBar = require('progress');
var vfs = require('vinyl-fs');

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

	opts.prefix = opts.prefix | '';
	var service = azure.createBlobService(opts.account, opts.key);
	var q = queue({ concurrency: 5, timeout: 1000 * 60 * 2 });
	
	var stream = es.through(function(data) {
		q.push(function(cb) {
			service.createBlockBlobFromLocalFile(opts.container, opts.prefix + data.relative, data.path, {
				metadata: {
					fsmode: data.stat.mode
				}
			}, cb);
		})}, function () {
			var that = this;
			service.createContainerIfNotExists(opts.container, function (err) {
				if (err) { that.emit('error', err); }
				if (!opts.quiet) {
					var bar = new ProgressBar('uploading [:bar] :percent', { total: q.length });
					bar.tick(0);
					q.on('success', function () { bar.tick(); });
				}
				q.on('error', function (err) { that.emit('error', err); });
				q.start(function () { that.emit('end'); });
			});
		}).on('end', function () { });
	
	return stream;
};