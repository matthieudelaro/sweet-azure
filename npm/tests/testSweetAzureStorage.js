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

/*global describe, before, it, after:false */
'use strict';

var dotenv = require('dotenv');
dotenv.load();

var Storage = require('../SweetAzureStorage.js'),
    request = require('supertest'),
    express = require('express');

var runTests = function() {
    describe('SweetAzure.Storage', function() {
        before(function() {
            if (!(process.env.SWEETAZURE_STORAGE_STORAGE_ACCOUNT || process.env.AZURE_STORAGE_ACCOUNT) ||
                !(process.env.SWEETAZURE_STORAGE_ACCESS_KEY || process.env.AZURE_STORAGE_ACCESS_KEY)) {
                throw new Error("Please set environment variables SWEETAZURE_STORAGE_STORAGE_ACCOUNT | AZURE_STORAGE_ACCOUNT and SWEETAZURE_STORAGE_ACCESS_KEY | SWEETAZURE_STORAGE_ACCESS_KEY. You may enter them in a .env file as follow :\nSWEETAZURE_STORAGE_STORAGE_ACCOUNT=YOUR_STORAGE_ACCOUNT_NAME\nAZURE_STORAGE_ACCESS_KEY=AAA++++++FAKE+++KEY++++++++AAA");
            }
        });

        it("should be a valid object", function(done) {
            if (Storage.configure && typeof Storage.configure === 'function' &&
                Storage.Features &&
                Storage.Features.createContainerIfNotExists && typeof Storage.Features.createContainerIfNotExists === 'function') {
                done();
            } else {
                done(new Error('lakes some elements/with wrong types'));
            }
        });


        describe('.setupStorageAccount()', function() {
            it("should setup storage account", function(done) {
                Storage.setupStorageAccount().then(function(){
                    done();
                }, function(error) {
                    done(error);
                });
            });
        });


        describe('.Features', function() {
            describe('.getReadSASforBlob()', function() {
                it("should return a read access SAS", function(done) {
                    var sas = Storage.Features.getReadSASforBlob("blobname1.jpg");
                    if (sas && typeof sas === 'string' && sas.length > 0) {
                        done();
                    } else {
                        done(new Error("bad SAS : " + sas));
                    }
                });
            });


            describe('.getReadSASforBlob()', function() {
                it("should return a write access SAS", function(done) {
                    var sas = Storage.Features.getWriteSASforBlob("blobname1.jpg");
                    if (sas && typeof sas === 'string' && sas.length > 0) {
                        done();
                    } else {
                        done(new Error("bad SAS : " + sas));
                    }
                });
            });
        });

        describe(".Routes", function() {
            describe(".getRouter()", function() {
                describe("provides a fonctional router with environment parameters", function (){
                    var app;
                    var server;
                    var port = 3001;
                    var blobName = "myBlobname";
                    var storageConf = Storage.getConfig();

                    before(function() {
                        app = express();
                        var router = Storage.Routes.getRouter();
                        app.use('/', router);
                        server = app.listen(port);
                    });

                    after(function() {
                        server.close();
                    });

                    it("should retrieve a read sas", function(done){
                        request("http://localhost:" + port)
                        .post(storageConf.Routes.readSASroute)
                        .send({blobName: blobName})
                        .expect(200)
                        .expect(function(res) {
                            if (res.body.blobName === blobName &&
                                typeof res.body.expiryTimeInMinutes === "number" &&
                                typeof res.body.sas === "string" &&
                                res.body.sas.length > 0) {
                            } else {
                                throw new Error('Bad Answer : ' + JSON.stringify(res.body));
                            }
                        })
                        .end(done);
                    });

                    it("should retrieve a write sas", function(done){
                        request("http://localhost:" + port)
                        .post(storageConf.Routes.writeSASroute)
                        .send({blobName: blobName})
                        .expect(200)
                        .expect(function(res) {
                            if (res.body.blobName === blobName &&
                                typeof res.body.expiryTimeInMinutes === "number" &&
                                typeof res.body.sas === "string" &&
                                res.body.sas.length > 0) {
                            } else {
                                throw new Error('Bad Answer : ' + JSON.stringify(res.body));
                            }
                        })
                        .end(done);
                    });
                });

                describe("provides a fonctional router with custom parameters", function (){
                    var app;
                    var server;
                    var port = 3001;
                    var blobName = "myBlobname";
                    var subRouteForStorageRouter = "/sasPath";
                    var storageConf;

                    before(function() {
                        app = express();
                        Storage.Routes.configure({
                            readSASroute: "/tutiRead_customRoute",
                            writeSASroute: "/tutiPostWriteSAS_customRoute"
                        });
                        storageConf = Storage.getConfig();
                        var router = Storage.Routes.getRouter();
                        app.use(subRouteForStorageRouter + "/", router);
                        server = app.listen(port);
                    });

                    after(function() {
                        server.close();
                    });

                    it("retrieve a read sas", function(done){
                        request("http://localhost:" + port)
                        .post(subRouteForStorageRouter + storageConf.Routes.readSASroute)
                        .send({blobName: blobName})
                        .expect(200)
                        .expect(function(res) {
                            if (res.body.blobName === blobName &&
                                typeof res.body.expiryTimeInMinutes === "number" &&
                                typeof res.body.sas === "string" &&
                                res.body.sas.length > 0) {
                            } else {
                                throw new Error('Bad response : ' + JSON.stringify(res.body));
                            }
                        })
                        .end(done);
                    });

                    it("retrieve a write sas", function(done){
                        request("http://localhost:" + port)
                        .post(subRouteForStorageRouter + storageConf.Routes.writeSASroute)
                        .send({blobName: blobName})
                        .expect(200)
                        .expect(function(res) {
                            if (res.body.blobName === blobName &&
                                typeof res.body.expiryTimeInMinutes === "number" &&
                                typeof res.body.sas === "string" &&
                                res.body.sas.length > 0) {
                            } else {
                                throw new Error('Bad response : ' + JSON.stringify(res.body));
                            }
                        })
                        .end(done);
                    });
                });
            });
        });
    });

};

module.exports = runTests;
