gulp-azure-storage
==================

Gulp plugin to download and upload files to/from the Azure blob storage.

## Installation

```
npm install gulp-azure-storage
```

## Usage

### Upload
Simply pipe in a gulp stream:

```javascript
gulp.task(['default'], function() { 
  return gulp.src('path')
    .pipe(azure.upload({
    	account:    ACCOUNT_NAME,
    	key:        ACCOUNT_KEY,
    	container:  CONTAINER_NAME
    }));
});
```
### Download

Simply use it as a gulp source stream:

```javascript
var gulp = require('gulp');
var azure = require('gulp-azure-storage');

gulp.task(['default'], function() {
  return azure.download({
  	account:    ACCOUNT_NAME,
  	key:        ACCOUNT_KEY,
  	container:  CONTAINER_NAME
  }).pipe(gulp.dest('out'));
});
```

## Options

Mandatory:
- `account`
- `key`
- `container`

Optional:
- `prefix` - blob name prefix
- `quiet` - shhh
- `buffer` - `boolean` for whether to buffer the blobs or stream them (only for download)