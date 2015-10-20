'use strict';


var express = require('express');

var app = express();
// app.use(morgan("dev"));

var port = 9450;

app.use(require('connect-livereload')({
    port: 35729
}));

app.listen(port);
console.log("server is running on port " + port);
