var azure = require('azure-storage');
var vfs = require('vinyl-fs');
var es = require('event-stream');
var queue = require('queue');
var ProgressBar = require('progress');
var File = require('vinyl');

module.exports = function (account, key, container, prefix) {
	var service = azure.createBlobService(account, key);

	return es.readable(function (count, callback) {
		var that = this;
		
		function loop(token) {
			service.listBlobsSegmentedWithPrefix(container, prefix, token, null, function (err, result) {
				if (err) { return callback(err); }

				result.entries.forEach(function (entry) {
					that.emit('data', entry.name);
				});

				console.log(result.entries.length);

				if (result.continuationToken) {
					loop(result.continuationToken);
				} else {
					that.emit('end');
				}
			});
		}

		loop(null);
	}).pipe(es.mapSync(function (name, callback) {
		return new File({
			base: prefix + '/',
			path: name,
			contents: service.createReadStream(container, name)
		});
	}));
};
