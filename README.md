# sweet-azure

A short, secured, and easy way to use Azure Storage.

## Server side

This module provides the following :

  * SweetAzure.Storage
  * SweetAzure.Logger


### Installation

```sh
$ npm install sweet-azure
```

### Configuration

You may use environment variables to configure SweetAzure. Here is an example of .env file to set up your dev environment using [dotenv](https://www.npmjs.com/package/dotenv "dotenv") :
```bash
SWEETAZURE_STORAGE_STORAGE_ACCOUNT=your_storage_account_name
SWEETAZURE_STORAGE_ACCESS_KEY=the_access_key_of_your_storage_account
SWEETAZURE_STORAGE_CONTAINER_NAME=the_name_of_the_container_you_want_sweet-azure_to_work_on
SWEETAZURE_STORAGE_SAS_EXPIRY_TIME_IN_MINUTES=duration_of_validity_of_sas_generated_by_sweet-azure
SWEETAZURE_LOGGER_FIREBASE_URL=https://youraccount.firebaseio.com/lognode
```
NB : You may reference this .env file in your .gitignore, and define environment variables for production using [Azure Portal](https://manage.windowsazure.com "azure portal")

### API

```js
var SweetAzure = require('sweet-azure');
```

#### SweetAzure.Storage
Provides features to upload files to Azure Blob Storage using SAS.
Basic example :
```js
var express = require('express'),
    SweetAzure = require('sweet-azure'),
    Storage = SweetAzure.Storage;

var app = express();

console.log('Making sure that a valid container exists, with valid CORS properties.');
Storage.setupStorageAccount().then(function() {
    // app.use('/', /* middleware to restrict access to authenticated users */);
    app.use('/', Storage.Routes.getRouter());
    app.listen(port);
});
```

#### SweetAzure.Logger
Provides several loggers.

##### SweetAzure.Logger.Configurations.newFirebase(settings)

This logger enables you to log directly to Firebase. This is espacially useful if you don't have access to standard output (with Azure Mobile Services for example)

settings.firebaseUrl : (optional) the URL of your firebase node.
Defaults to process.env.SWEETAZURE_LOGGER_FIREBASE_URL;

settings.firebaseReference : (optional) an initialised firebase node.

settings.enable = (optional) a boolean. Defaults to process.env.SWEETAZURE_LOGGER_FIREBASE_ENABLE or true;

Common use :
```js
'use strict';

var dotenv = require('dotenv');
dotenv.load();

var SweetAzure = require('sweet-azure'),
    Logger = SweetAzure.Logger;

// Create a logger using environment variables :
var logger = Logger.Configurations.newFirebase();
logger.log("Log Hello World! to Firebase");

// or overriding environment variables by supplying settings :
var logger2 = Logger.Configurations.newFirebase({
    firebaseUrl: "https://myaccount.firebaseio.com/azure"
});
logger2.log("Log Hello World! to an other Firebase node");
```
Then you may want to set up Security & Rules of Firebase to make  sure that nobody except you can read the data that you are logging:
```json
{
    "rules": {
        ".read": false,
        ".write": true
    }
}
```
## Client side

Not available yet (still testing).

### Installation
Install it using bower :
```sh
$ bower install sweet-azure
```
Then load it in your browser :
```html
<script src="bower_components/sweet-azure/SweetAzure.js"></script>
```
or require it :
```js
var SweetAzure = require('sweet-azure');
```

### API

#### With AngularJS
If AngularJS is used on the page, SweetAzure does not declare itself as a global variable, but makes itself available as an AngularJS module called SweetAzure.

```js
angular.module('YourModule', [])
.factory('YourModule', ['SweetAzure',
            function   ( SweetAzure) {
    // enjoy SweetAzure here
}]);
```

#### Without AngularJS
If AngularJS is not used on the page, SweetAzure relies on [Kriskowal's promises](https://github.com/kriskowal/q "q") and on [jQuery](https://github.com/jquery/jquery "jQuery"). It may define itself using RequireJS, SES, CommonJS, or as a global variable called SweetAzure.

```js
SweetAzure.configure({/* This step is optional*/});
SweetAzure.upload({file: myFormInputFile[0]}).then(function(){
    console.log("The file has been successfully uploaded.");
})
```

## License

[MIT](LICENSE)

