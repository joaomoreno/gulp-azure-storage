gulp-azure-storage
==================

Gulp plugin to download and upload files to/from the Azure blob storage.

## Installation

```
npm install gulp-azure-storage
```

## Usage

```javascript
var gulp = require('gulp');
var azure = require('gulp-azure-storage');

gulp.task(['default'], function() {
  return azure({
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
