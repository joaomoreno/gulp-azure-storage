var azure = require('azure-storage');
var es = require('event-stream');
var File = require('vinyl');
var delayed = require('delayed-stream');
var ProgressBar = require('progress');

module.exports = function (account, key, container, prefix) {
	var service = azure.createBlobService(account, key);

	return es.readable(function (count, callback) {
		var that = this;

		function loop(token) {
			service.listBlobsSegmentedWithPrefix(container, prefix, token, null, function (err, result) {
				if (err) { return callback(err); }

				result.entries.forEach(function (entry, i) {
					var stream = delayed.create(service.createReadStream(container, entry.name), {
						maxDataSize: 1024 * 1024 * 50
					});

					that.emit('data', new File({
						cwd: '.',
						base: prefix + '/',
						path: entry.name,
						contents: stream
					}));
				});

				if (result.continuationToken) {
					loop(result.continuationToken);
				} else {
					that.emit('end');
				}
			});
		}

		loop(null);
	});
};
