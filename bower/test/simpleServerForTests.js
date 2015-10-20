'use strict';

var dotenv = require('dotenv');
dotenv.load();
var port = 5030;

var express = require('express'),
    Storage = require('sweet-azure').Storage;

var app = express();
app.all("*", Storage.Features.CORSMiddleware);

console.log('settings up storage account...');
Storage.setupStorageAccount().then(function() {
    app.use('/', Storage.Routes.getRouter());
    app.listen(port);
    console.log("server is running on port " + port, 'http://localhost:'+port);
}, function(err) {
    console.log('error', err);
});
