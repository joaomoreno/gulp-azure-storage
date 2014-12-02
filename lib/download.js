var azure = require('azure-storage');
var es = require('event-stream');
var File = require('vinyl');
var ProgressBar = require('progress');
var stream = require('stream');

module.exports = function (account, key, container, prefix) {
	var service = azure.createBlobService(account, key);

	return es.readable(function (count, callback) {
		var that = this;

		function loop(token) {
			service.listBlobsSegmentedWithPrefix(container, prefix, token, null, function (err, result) {
				if (err) { return callback(err); }

				result.entries.forEach(function (entry, i) {
					var didStartStreaming = false;
					var pass = new stream.PassThrough();
					var pipe = pass.pipe;
					
					pass.pipe = function (eventName) {
						pipe.apply(pass, arguments);

						if (!didStartStreaming) {
							didStartStreaming = true;
							service.createReadStream(container, entry.name).pipe(pass);
						}
					};

					that.emit('data', new File({
						cwd: '.',
						base: prefix + '/',
						path: entry.name,
						contents: pass
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
