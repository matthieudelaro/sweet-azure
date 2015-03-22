// The MIT License (MIT)

// Copyright (c) 2015 matthieudelaro

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use strict';

// var azure = require('azure-storage'),
var tracer = require('tracer'),
    Firebase = require('firebase'),
    dateFormat = require('dateformat');

/*
 * SweetAzure.Logger module
 */
module.exports = (function() {
    var Logger = {};

    /*
     * SweetAzure.Logger.Configurations module
     */
    Logger.Configurations = (function() {
        var Configurations = {};
        var doNothing = function(){};

        Configurations.Console = console;

        Configurations.Null = {
            trace: doNothing,
            log: doNothing,
            info: doNothing,
            warn: doNothing,
            debug: doNothing,
            error: doNothing
        };

        Configurations.tracer = tracer;

        // Configurations.newAzureTable = function(settings) {
        //     settings = settings || {};
        //     settings.azureStorageAccount = settings.azureStorageAccount || process.env.SWEETAZURE_LOGGER_STORAGE_ACCOUNT;
        //     settings.azureAccessKey = settings.azureAccessKey || process.env.SWEETAZURE_LOGGER_ACCESS_KEY;

        //     function Log(level, data) {
        //         this.level = level;
        //         this.data = data;
        //     }

        //     function sendLog(log) {
        //         throw new Error('Yet to be implemented');
        //     }

        //     return {
        //         log:   function(data){ sendLog(new Log(Logger.Levels.LOG, data)); },
        //         info:  function(data){ sendLog(new Log(Logger.Levels.INFO, data)); },
        //         warn:  function(data){ sendLog(new Log(Logger.Levels.WARN, data)); },
        //         error: function(data){ sendLog(new Log(Logger.Levels.ERROR, data)); },
        //     };
        // };

        Configurations.newFirebase = function(settings) {
            settings = settings || {};
            settings.firebaseUrl = settings.firebaseUrl || process.env.SWEETAZURE_LOGGER_FIREBASE_URL;
            settings.firebaseReference = settings.firebaseReference || null;
            settings.enable = settings.enable || process.env.SWEETAZURE_LOGGER_FIREBASE_ENABLE;

            if (settings.enable) {
                var rootRef = settings.firebaseReference || new Firebase(settings.firebaseUrl);
                var currentDate = new Date();
                var sessionId = dateFormat(currentDate, "yyyy-mmmm-dd HH-MM-ss ") + currentDate.getMilliseconds();
                var sessionRef = rootRef.child(sessionId);

                var logger = require('tracer').colorConsole({
                    transport : function(data) {
                        sessionRef.push(data.file + ":" + data.line + ":" + data.message);
                    }
                });

                return logger;
            } else {
                return Configurations.Null;
            }
        };

        Configurations.newGroup = function(list) {
            list = list || [];

            var methods = ['trace', 'log', 'info', 'warn', 'debug', 'error'];

            function forward(method, argumentsToForward) {
                for (var i = 0; i < list.length; i++) {
                    try {
                        var m = list[i][method];
                        m.apply(m, argumentsToForward);
                    } catch (err) {}
                }
            }

            var res = {
                add: function(element) {
                    list.push(element);
                }
            };

            methods.forEach(function(value) {
                res[value] = function(args) {
                    forward(value, arguments);
                };
            });
            return res;
        };

        return Configurations;
    })();

    Logger.common = null;

    Logger.use = function(logger) {
        Logger.common = logger;
        return logger;
        // Logger.trace = logger.trace;
        // Logger.log = logger.log;
        // Logger.info = logger.info;
        // Logger.warn = logger.warn;
        // Logger.debug = logger.debug;
        // Logger.error = logger.error;
        // return logger;
    };

    Logger.use(Logger.Configurations.Console);

    return Logger;
})();
