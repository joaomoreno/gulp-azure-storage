var azure = require('azure-storage');
var vfs = require('vinyl-fs');
var es = require('event-stream');
var queue = require('queue');
var ProgressBar = require('progress');

module.exports = function (account, key, container, prefix, filePaths, callback) {
	prefix = prefix.replace(/\/+$/, '') + '/';
	var service = azure.createBlobService(account, key);

	service.createContainerIfNotExists(container, function (err) {
		if (err) { return callback(err); }

		var q = queue({ concurrency: 10, timeout: 1000 * 60 * 2 });

		vfs.src(filePaths.map(function(arg) {
			return arg + '/**/*';
		})).pipe(es.through(function (data) {
			q.push(function (cb) {
				console.log(prefix + data.relative);
				service.createBlockBlobFromLocalFile(container, prefix + data.relative, data.path, cb);
			});
	  }, function () {
	  	var that = this;
			var bar = new ProgressBar('uploading [:bar] :percent', { total: q.length });
			bar.tick(0);

			q.on('success', function () { bar.tick(); });
	  	q.start(function () {
	  		that.emit('end');
	  	});
	  })).on('end', function () { callback(); });
	});
};
