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

var SweetAzure = require('../SweetAzure.js'),
    // should = require('should'),
    chai = require('chai'),
    expect = chai.expect,
    assert = chai.assert,
    q = require('q'),
    chaiAsPromised = require("chai-as-promised"),
    express = require('express'),
    Storage = require('sweet-azure').Storage;

chai.use(chaiAsPromised);

var runTests = function() {
    describe('SweetAzure', function() {
        before(function() {
            assert.notEqual(typeof SweetAzure, 'undefined', "SweetAzure is not defined");
        });

        it("should have some key elements", function() {
            expect(SweetAzure.State).to.be.an('object');
            expect(SweetAzure.stateToString).to.be.a('function');
            expect(SweetAzure.configure).to.be.a('function');
            expect(SweetAzure.resetConfiguration).to.be.a('function');
        });

        describe(".getConfig()", function() {
            it("should return a valid configuration", function() {
                var c = SweetAzure.getConfig();
                expect(c).to.have.property('logger');
                expect(c).to.have.property('backend');
                // expect(c).to.have.property('then');
            });
        });

        describe(".upload()", function() {
            it("should be a function", function() {
                expect(SweetAzure.upload).to.be.a('function');
            });
            it("should return a promise", function() {
                // console.log(q);
                // console.log(SweetAzure.upload().constructor);
                // console.log(SweetAzure.upload().constructor.toString());
                // expect(SweetAzure.upload()).to.be.an.instanceof(q.Promise);
                return expect(SweetAzure.upload()).to.have.property('then').which.is.a('function');
            });
            it("should require a file as argument", function() {
                return expect(SweetAzure.upload()).to.be.rejected.and
                                                  .to.eventually.have.property('message', 'settings.file should be a file');
            });
            describe("it should connect to the right server", function() {
                var app;
                var server;
                var port = 3001;
                var storageConf = Storage.getConfig();
                var writeMiddlewareCallback;

                it("should call the right middleware with basic configuration", function(done) {
                    writeMiddlewareCallback = function() {
                        done();
                    };
                    SweetAzure.configure({
                        backend: {
                            URL: "http://localhost:" + port
                        },
                        logger: console
                    });
                    // console.log(SweetAzure.getConfig());
                    SweetAzure.upload({
                        file: {"webkitRelativePath":"","lastModified":1426891775000,"lastModifiedDate":"2015-03-20T22:49:35.000Z","name":"testFile.txt","type":"text/plain","size":10},
                    }).then(null, null, function(data) {
                        console.log('update:', data);
                    }, function(error) {
                        done(error);
                    });
                });

                before(function() {
                    app = express();
                    Storage.Routes.configure({
                        writeSASmiddleware: function(req, res) {
                            // storageConf.Routes.writeSASmiddleware(req, res);
                            console.log("lol");
                            writeMiddlewareCallback();
                        }
                    });
                    storageConf = Storage.getConfig();
                    // console.log(storageConf);
                    var router = Storage.Routes.getRouter();
                    app.use('/', router);
                    server = app.listen(port);
                });

                after(function() {
                    // console.log("think about closing the server !");
                    server.close();
                });
            });
        });

        // describe('.test', function() {
        //     it('should work', function() {
        //     });
        // });

    });

};

module.exports = runTests;

runTests();
