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

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /* jshint strict: false */

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

    // // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else {
        var result = definition();
        SweetAzure = result;
    }

    // else if angular {
        //
    // }
})(function () {
"use strict";

// function SweetAzure(q) {
function SweetAzure(q, jquery) {
    /**
    * SweetAzure gives access to functions to upload files.
    * @namespace Service SweetAzure
    * @class
     */
    var SweetAzure = this;

    var conf;

    SweetAzure.State = {
        /**
        * Public enumeration of FileHandler states
        * Users should compare getState() to those values.
        * @static
        * @final
        * @see SweetAzure.stateToString
        * @property {Object} SweetAzure.State
            @property {Number} SweetAzure.State.INITIALIZING
            @property {Number} SweetAzure.State.SENDING
            @property {Number} SweetAzure.State.FINISHED
            @property {Number} SweetAzure.State.ERROR
         */
        INITIALIZING: 1,
        SENDING: 2,
        FINISHED: 3,
        ERROR: 4
    };

    var noop = function(){};

    /**
     * Returns a string based on a state.
     * @method stateToString
     * @see SweetAzure.State
     * @param {Number} s the given state. Must be a value of SweetAzure.State
     * @return {String} the string corresponding to the state
     */
    SweetAzure.stateToString = function(s) {
        for (var state in SweetAzure.State) {
            if (SweetAzure.State[state] === s) {
                return state;
            }
        }
        return "UNDEFINED";
    };

    var sendingStates = {
        /**
        * Private enumeration of SweetAzure sending states.
        * @static
        * @private
        * @final
        * @property {Object} sendingStates
            @property {Number} sendingStates.RETRIEVING_SAS
            @property {Number} sendingStates.UPLOADING_FILE_CHUNKS
            @property {Number} sendingStates.COMMITTING_FILE_CHUNKS
            @property {Number} sendingStates.NOT_SENDING
         */
        RETRIEVING_SAS: 1,
        UPLOADING_FILE_CHUNKS: 3.1,
        COMMITTING_FILE_CHUNKS: 3.2,
        NOT_SENDING: -1
    };

    SweetAzure.Uploader = (function() {
        var maxRetryPerBlock = 5,
            maxSASretryPerBlock = 1,
            blockIdPrefix = "block-";

        var defaultGetSASMethod = function(that) {
            var deferred = q.defer();

            var uri = conf.backend.URL + conf.backend.SASPath + conf.backend.writeSASroute;

            jquery.ajax({
                url: uri,
                type: "POST",
                data: {
                    blobName: that.blobName
                },
                processData: true,
                success: function (data, status) {
                    deferred.resolve(data);
                },
                error: function(xhr, desc, err) {
                    deferred.reject(err);
                },
                crossDomain: true
            });

            return deferred.promise;
        };

        /**
         * Gives an idea of what part of the file has been uploaded yet.
         * @method percentage
         * @return {Number} 0 to 100
         */
        var percentage = function(that, privat) {

            if (privat.state === SweetAzure.State.SENDING) {
                if (privat.sendingState === sendingStates.NOT_SENDING) {
                    return 0;
                } else if (privat.sendingState === sendingStates.RETRIEVING_SAS) {
                    return 1;
                } else if (privat.sendingState === sendingStates.UPLOADING_FILE_CHUNKS) {
                    var p = (privat.bytesUploaded / that.fileSize) * 100;
                    if (p <= 1.0) {
                        return 1;
                    } else if (p > 98.0){
                        return 98;
                    } else {
                        return p;
                    }
                } else if (privat.sendingState === sendingStates.COMMITTING_FILE_CHUNKS) {
                    return 99;
                } else {
                    privat.logger.log("state === SENDING but sendingState is " + privat.sendingState);
                }
            } else if (privat.state === SweetAzure.State.FINISHED){
                return 100;
            } else {
                return 0;
            }
        };

        /**
         * @method setStates
         * @param {Number} state must be a value contained in SweetAzure.State
         * @param {Number} sendingState must be a value contained in sendingStates
         * @private
         */
        var setStates = function(that, privat, state, sendingState) {
            privat.state = state || privat.state;
            privat.sendingState = sendingState || privat.sendingState;
            privat.deferred.notify(percentage(that, privat));
        };

        /**
         * Description
         * @method uploadFileInBlocks
         * @private
         * @return
         */
        var uploadFileInBlocks = (function(){
            function pad(number, length) {
                var str = '' + number;
                while (str.length < length) {
                    str = '0' + str;
                }
                return str;
            }

            /**
             * @method onloadend
             * @param {Object} evt
             * @private
             * @return
             */
            function onLoadEndCallbackForReader(evt, that, privat) {
                if (evt.target.readyState === FileReader.DONE) { // DONE == 2
                    var uri = privat.submitUri + '&comp=block&blockid=' + privat.blockIds[privat.blockIds.length - 1];
                    // uri old = https://filesuploadstorage.blob.core.windows.net/publicblobs/ce84bded-3794-4aab-b905-83113da27327/testFile.txt?st=2015-03-21T18%3A02%3A47Z&se=2015-03-22T23%3A20%3A47Z&sp=w&sr=b&sv=2012-02-12&sig=%2FeU8B40iNhjWNiVqnx%2BBo4VNBa8X2ih9qCCtGN6eLhY%3D&comp=block&blockid=YmxvY2stMDAwMDAw
                    //https://filesuploadstorage.blob.core.windows.net/publicblobssas/logo.png/logo.png?st=2014-03-19T13%3A11%3A08Z&se=2014-03-19T17%3A01%3A08Z&sr=b&sv=2012-02-12&sig=Z0cnel6GjjJ92EalXUeXj9tCsJsFAmYlAy6kst%2B8KkY%3D&comp=block&blockid=YmxvY2stMDAwMDAw
                    var requestData = new Uint8Array(evt.target.result);
                    jquery.ajax({
                        url: uri,
                        type: "PUT",
                        data: requestData,
                        processData: false,
                        beforeSend: function(xhr) {
                            xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
                            xhr.setRequestHeader('x-ms-blob-content-type', that.file.type);
                        },
                        success: function (data, status) {
                            privat.currentFilePointer += privat.maxBlockSize;
                            privat.totalBytesRemaining -= privat.maxBlockSize;
                            privat.numberOfRetryForCurrentBlob = 0;
                            privat.quantityOfSASretry = 0;

                            privat.bytesUploaded += requestData.length;

                            uploadBlocksThenCommitBlocks(that, privat);
                        },
                        error: function(xhr, desc, err) {
                            privat.logger.log("Error while sending the file :", err, xhr, desc);

                            privat.blockIds.pop();//delete the block which failed
                            privat.numberOfRetryForCurrentBlob++;
                            if (privat.numberOfRetryForCurrentBlob > maxRetryPerBlock) {
                                // var message = "An error occured. Please try again. "+
                                //     "(The problem may be that the expiry time set for "+
                                //     "the SAS is only " + expiryTimeInMinutes + " minutes.)";// TODO : expiryTimeInMinutes ?
                                privat.quantityOfSASretry++;
                                if (privat.quantityOfSASretry > maxSASretryPerBlock) {
                                    privat.deferred.reject(err);
                                } else {
                                    privat.logger.log("Retrieving a new SAS.");
                                    retrieveSAS(that, privat);
                                }
                            } else{
                                uploadBlocksThenCommitBlocks(that, privat);
                            }
                        },
                        crossDomain: true
                    });
                }
            }

            function uploadBlocksThenCommitBlocks(that, privat) {
                if (privat.totalBytesRemaining > 0) {
                    var fileContent = that.file.slice(privat.currentFilePointer, privat.currentFilePointer + privat.maxBlockSize);
                    var blockId = blockIdPrefix + pad(privat.blockIds.length, 6);
                    privat.blockIds.push(btoa(blockId));
                    privat.reader.readAsArrayBuffer(fileContent);
                    if (privat.totalBytesRemaining < privat.maxBlockSize) {
                        privat.maxBlockSize = privat.totalBytesRemaining;
                    }
                    privat.deferred.notify(percentage(that, privat));
                } else {
                    setStates(that, privat, undefined, sendingStates.COMMITTING_FILE_CHUNKS);
                    var uri = privat.submitUri + '&comp=blocklist';
                    var requestBody = '<?xml version="1.0" encoding="utf-8"?><BlockList>';
                    for (var i = 0; i < privat.blockIds.length; i++) {
                        requestBody += '<Latest>' + privat.blockIds[i] + '</Latest>';
                    }
                    requestBody += '</BlockList>';
                    jquery.ajax({
                        url: uri,
                        type: "PUT",
                        data: requestBody,
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader('x-ms-blob-content-type', that.file.type);
                        },
                        success: function (data, status) {
                            setStates(that, privat, SweetAzure.State.FINISHED, sendingStates.NOT_SENDING);
                            privat.deferred.resolve();
                        },
                        error: function (xhr, desc, err) {
                            privat.logger.log("Error while comimting blocks :", err, xhr, desc);
                            privat.deferred.reject("Error while committing block list : " + desc + " / " + err);
                        },
                        crossDomain: true
                    });
                }
            }

            return function(that, privat) {
                privat.reader = new FileReader();
                privat.reader.onloadend = function(evt) {
                    onLoadEndCallbackForReader(evt, that, privat);
                };
                uploadBlocksThenCommitBlocks(that, privat);
            };
        })();

        function retrieveSAS(that, privat) {
            setStates(that, privat, SweetAzure.State.SENDING, sendingStates.RETRIEVING_SAS);
            privat.getSAS(that).then(function(retrievedSAS) {
                privat.logger.log("retieved sas : ", retrievedSAS);

                // upload file chunk by chunk
                setStates(that, privat, undefined, sendingStates.UPLOADING_FILE_CHUNKS);

                privat.submitUri = retrievedSAS.sas;
                privat.blobName = retrievedSAS.blobName;
                privat.expiryTimeInMinutes = retrievedSAS.expiryTimeInMinutes;

                uploadFileInBlocks(that, privat);
            }, function(reason) {
                var message = 'Retrieving sas failed: ' + reason;
                privat.logger.log(message);
                privat.deferred.reject(message);
            });
        }

        function Uploader(settings) {
            var that = this;

            var privat = {};

            privat.deferred = q.defer();
            that.promise = privat.deferred.promise;

            settings = settings || {};
            privat.logger = settings.logger || conf.logger;

            if (!settings.file) {
                privat.deferred.reject(new Error("settings.file should be a file"));
            } else {
                that.file = settings.file;
                that.fileSize = typeof that.file.size === 'function' ? that.file.size() : that.file.size;
                privat.fileType = settings.fileType || 'form'; // by default, the file is considered as a a file coming from a form on the webpage
                that.blobName = privat.blobName || settings.file.name;

                privat.state = SweetAzure.State.INITIALIZING;
                privat.sendingState = sendingStates.NOT_SENDING;
                privat.currentFilePointer = 0;
                privat.totalBytesRemaining = 0;
                privat.numberOfBlocks;
                privat.submitUri;
                privat.expiryTimeInMinutes;
                privat.bytesUploaded = 0;
                privat.blockIds = [];
                privat.numberOfRetryForCurrentBlob = 0;
                privat.quantityOfSASretry = 0;
                privat.maxBlockSize = 4194304;// = azure.Constants.BlobConstants.DEFAULT_WRITE_BLOCK_SIZE_IN_BYTES (azure refers to nodejs azure storage sdk)

                var fileSize = settings.file.size;
                if (fileSize < privat.maxBlockSize) {
                    privat.maxBlockSize = fileSize;
                }
                privat.totalBytesRemaining = fileSize;
                if (fileSize % privat.maxBlockSize === 0) {
                    privat.numberOfBlocks = fileSize / privat.maxBlockSize;
                } else {
                    privat.numberOfBlocks = parseInt(fileSize / privat.maxBlockSize, 10) + 1;
                }

                privat.getSAS = settings.getSAS || defaultGetSASMethod;

                retrieveSAS(that, privat);
            }

            // privat.deferred.promise.then(function(data) {
            //     console.log('success', data);
            // }, function(data) {
            //     console.log('error', data);
            // }, function(data) {
            //     console.log('hoho', data);
            // });
        }

        return Uploader;
    })();

    SweetAzure.upload = function(settings) {
        var uploader = new SweetAzure.Uploader(settings);
        return uploader.promise;
    };

    SweetAzure.getConfig = function() {
        return conf;
    };

    SweetAzure.configure = function(settings) {
        conf = conf || {};
        settings = settings || {};

        conf.logger = settings.logger || {
            trace: noop,
            log: noop,
            info: noop,
            warn: noop,
            debug: noop,
            error: noop
        };

        // handle backend
        conf.backend = conf.backend || {};
        settings.backend = settings.backend || {};
        conf.backend.URL = settings.backend.URL || conf.backend.URL || ""; // $window.location.href.split($window.location.pathname)[0];
        conf.backend.SASPath = settings.backend.SASPath || conf.backend.SASPath || "";
        conf.backend.readSASroute = settings.backend.readSASroute || conf.backend.readSASroute || "/readsas";
        conf.backend.writeSASroute = settings.backend.writeSASroute || conf.backend.writeSASroute || "/writesas";

        // // handle general callbacks
        // conf.then = conf.then || {
        //     success: noop,
        //     failure: noop,
        //     update : noop
        // };
        // settings.then = settings.then || {};
        // conf.then.success = settings.then.success || conf.then.success;
        // conf.then.failure = settings.then.failure || conf.then.failure;
        // conf.then.update  = settings.then.update  || conf.then.update;

        return SweetAzure;
    };

    SweetAzure.resetConfiguration = function() {
        conf = {};
        SweetAzure.configure();

        return SweetAzure;
    };
    SweetAzure.resetConfiguration();

    return SweetAzure;
}

if (typeof angular !== "undefined" &&
    typeof angular === "object" &&
    typeof angular.isString === "function") {

    angular.module('SweetAzure', [])
    .factory('SweetAzure', ['$q', '$http',
            function ($q,   $http) {
        return new SweetAzure($q, $http);
    }]);
} else {
    var promiseLibrary;
    if (typeof $q !== "undefined") {
        promiseLibrary = $q;
    } else if (typeof Q !== "undefined") {
        promiseLibrary = Q;
    } else if (typeof require !== "undefined") {
        promiseLibrary = require('q');
    } else {
        throw new Error("SweetAzure needs either $q, Q, or q in order to run properly.");
    }

    var jqueryLibrary;
    if (typeof $ !== "undefined") {
        jqueryLibrary = $;
    } else if (typeof require !== "undefined") {
        if (typeof window === 'undefined') {
            jqueryLibrary = require('jquery')(require("jsdom").jsdom().parentWindow);
        } else {
            jqueryLibrary = require('jquery');
        }
    } else {
        throw new Error("SweetAzure needs AngularJS or jQuery in order to run properly.");
    }

    // return new SweetAzure(promiseLibrary);
    return new SweetAzure(promiseLibrary, jqueryLibrary);
}
});
