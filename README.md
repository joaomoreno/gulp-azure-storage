gulp-azure-storage
==================

Gulp plugin to download and upload files to/from the Azure blob storage.

## Installation

```
npm install gulp-azure-storage
```

## Usage

### Upload

There's a script included with the module that allows you to upload some files to an azure container:

```bash
$ ./node_modules/.bin/upload-to-azure \
  --account ACCOUNT_NAME \
  --key ACCOUNT_KEY \
  --container CONTAINER_NAME \
  file1.txt \
  file2.txt
```

You can also provide a **relative** folder to upload every file in that folder structure, instead of every file, one by one:

```bash
$ ./node_modules/.bin/upload-to-azure \
  --account ACCOUNT_NAME \
  --key ACCOUNT_KEY \
  --container CONTAINER_NAME \
  folder
```

### Download

Simply use it as a gulp source stream:

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
