# sweet-azure

A short, secured, and easy to use Azure Storage.

## Server side
This module provides the following :

  * SweetAzure.Storage
  * SweetAzure.Logger


### Installation

```sh
$ npm install sweet-azure
```

### API

```js
var SweetAzure = require('sweet-azure');
```

#### SweetAzure.Storage
Provide features to upload files to Azure Blob Storage using SAS.
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
Provide several loggers.

##### SweetAzure.Logger.Configurations.newFirebase(settings)

This logger enables you to log directly to Firebase. This is espacially useful if you don't have access to regular logs (with mobile services for example)

settings.firebaseUrl : the URL of your firebase node.
Defaults to process.env.SWEETAZURE_LOGGER_FIREBASE_URL;

settings.firebaseReference : (optional) an initialised firebase node.

settings.enable = (optional) a boolean. Defaults to process.env.SWEETAZURE_LOGGER_FIREBASE_ENABLE or true;

##Client side
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
If AngularJS is not used on the page, SweetAzure relies on [Kriskowal's promises](https://github.com/kriskowal/q "q") and on [jQuery](https://github.com/jquery/jquery "jQuery"). It may define itself using RequireJS, SES, CommonJS, or as a global variable called SweetAzure.

```js
SweetAzure.configure({/* This step is optional*/});
SweetAzure.upload({file: myFormInputFile[0]}).then(function(){
    console.log("The file has been successfully uploaded.");
})
```

#### Without AngularJS
If AngularJS is used on the page, SweetAzure does not declare itself as a global variable, but makes itself available as an AngularJS module called SweetAzure.

```js
angular.module('YourModule', [])
.factory('YourModule', ['SweetAzure',
            function   ( SweetAzure) {
    // enjoy SweetAzure here
}]);
```

## License

[MIT](LICENSE)

