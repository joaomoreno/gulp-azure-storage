var azure = require('@azure/storage-blob');
var es = require('event-stream');
var queue = require('queue');
var ProgressBar = require('progress');
var createReadStream = require('streamifier').createReadStream;
var mime = require('mime');

module.exports = function (opts) {
	if (!opts.account) {
		throw new Error('Missing account option.');
	}

	if (!opts.container) {
		throw new Error('Missing container option.');
	}
	var metadata = opts.metadata || {}
	var contentSettings = opts.contentSettings || {}
	var prefix = opts.prefix || '';
	var credential = opts.credential ? opts.credential : (opts.key ? new azure.StorageSharedKeyCredential(opts.account, opts.key) : new azure.AnonymousCredential());
	var service = new azure.BlobServiceClient('https://' + opts.account + '.blob.core.windows.net/', credential, { retryOptions: { retryPolicyType: azure.StorageRetryPolicyType.EXPONENTIAL } });
	var q = queue({ concurrency: 4, timeout: 1000 * 60 * 2 });
	var count = 0;
	var stream = es.through(function (file) {
		var that = this;

		if (file.isDirectory()) {
			return;
		}

		q.push(function (cb) {
			var istream = file.isBuffer() ? createReadStream(file.contents) : file.contents;

			var client = service.getContainerClient(opts.container);
			var blobClient = client.getBlockBlobClient(prefix + file.relative);

			var blobHTTPHeaders = { blobContentType: mime.lookup(file.relative) };

			Object.keys(contentSettings).forEach(function (key) {
				blobHTTPHeaders['blob' + key[0].toUpperCase() + key.substring(1)] = contentSettings[key];
			});

			blobClient.uploadStream(istream, undefined, undefined, {
				metadata: Object.assign({ fsmode: file.stat.mode }, metadata),
				blobHTTPHeaders: blobHTTPHeaders
			}).then(function (r) {
				that.push(file);
				cb();
			}, function (err) {
				cb(err);
			});
		});
	}, function () {
		var that = this;
		var client = service.getContainerClient(opts.container);
		client.createIfNotExists().then(function () {
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
		}, function (err) { that.emit('error', err); });
	});

	return stream;
};
