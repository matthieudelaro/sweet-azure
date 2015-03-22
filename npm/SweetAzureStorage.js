'use strict';

var SweetAzureLogger = require('./SweetAzureLogger.js'),
    // out = SweetAzureLogger.Configurations.Console,
    azure = require('azure-storage'),
    q = require('q'),
    uuid = require('node-uuid'),
    express = require('express'),
    clone = require('clone'),
    bodyParser = require('body-parser');

/*
 * SweetAzure.Storage module
 */
module.exports = (function() {
    var Storage = {};
    var conf = {};// general configuration
    var blobService;

    Storage.Features = (function() {
        var Features = {};

        Features.getStorageDNS = function() {
            return conf.azureStorageAccount + '.' + azure.Constants.ConnectionStringKeys.BLOB_BASE_DNS_NAME;
        };

        Features.getStorageURL = function() {
            return "https://" + Features.getStorageDNS();
        };

        Features.getBlobSASUrl = function(blobName, sas) {
            return Features.getStorageURL() + "/" + conf.containerName + "/" + blobName + "?" + sas;
            // https://sweet.blob.core.windows.net/publicblobssas/logo.png/logo.png?st=2014-03-19T13%3A11%3A08Z&se=2014-03-19T17%3A01%3A08Z&sr=b&sv=2012-02-12&sig=Z0cnel6GjjJ92EalXUeX
        };

        Features.createContainerIfNotExists = function() {
            var deferred = q.defer();

            blobService.createContainerIfNotExists(
                conf.containerName,
                { publicAccessLevel: azure.BlobUtilities.BlobContainerPublicAccessType.BLOB},
                function(error) {
                    if (!error) {
                        deferred.resolve();
                    } else {
                        deferred.reject(error);
                    }
                }
            );

            return deferred.promise;
        };

        Features.setCorsProperties = function(properties) {
            properties = properties || {};
            properties.Cors = properties.Cors || {};
            properties.Cors.CorsRule = properties.Cors.CorsRule || [{
                AllowedOrigins: ['*'],
                AllowedMethods: ['GET,PUT,POST,DELETE,OPTIONS,HEAD,MERGE'],
                AllowedHeaders: ['*'],
                ExposedHeaders: ['*'],
                MaxAgeInSeconds: 7200
            }];

            var deferred = q.defer();
            blobService.setServiceProperties(properties, function (error, response) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(response);
                }
            });
            return deferred.promise;
        };

        Features.createSAS = function(settings) {
            settings = settings || {};
            settings.blobName = settings.blobName || uuid.v4();
            settings.SASexpiryTimeInMinutes = settings.SASexpiryTimeInMinutes || conf.SASexpiryTimeInMinutes;
            if (settings.permission === azure.BlobUtilities.SharedAccessPermissions.READ ||
                settings.permission === "r" ||
                settings.permission === "read" ||
                settings.permission === "READ") {
                settings.permission = azure.BlobUtilities.SharedAccessPermissions.READ;
            } else if (
                settings.permission === azure.BlobUtilities.SharedAccessPermissions.WRITE ||
                settings.permission === "w" ||
                settings.permission === "write" ||
                settings.permission === "WRITE"){
                settings.permission = azure.BlobUtilities.SharedAccessPermissions.WRITE;
            }
            settings.AccessPolicy = settings.AccessPolicy || {
                Permissions: settings.permission,
                Expiry : azure.date.minutesFromNow(settings.SASexpiryTimeInMinutes)
            };

            var sas = blobService.generateSharedAccessSignature(
                conf.containerName,
                settings.blobName, {
                AccessPolicy : settings.AccessPolicy
            });
            // example : sas === "se=1970-01-01T01%3A00%3A00Z&sp=r&sv=2014-02-14&sr=b&sig=rpQSVfojDJARwgCdRffwly%2F7U%3D"

            var sasURL = Features.getBlobSASUrl(settings.blobName, sas);
            // example : sasURL === "https://sweet.blob.core.windows.net/containerName/logo.png?se=2014-03-19T17%3A01%3A08Z&sr=b&sv=2012-02-12&sig=Z0cnel6GjjJ92EalXUeXj9tCsJsFAmY

            return sasURL;
        };

        Features.getReadSASforBlob = function(blobName) {
            return Features.createSAS({blobName: blobName, permission: 'r'});
        };

        Features.getWriteSASforBlob = function(blobName) {
            return Features.createSAS({blobName: blobName, permission: 'w'});
        };

        Features.CORSMiddleware = function(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Exposed-Headers", '*');
            res.header("Access-Control-Allow-Headers", '*');
            res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
            next();
        };

        return Features;
    })();

    Storage.Routes = (function() {
        var Routes = {};
        var routesConf = {};

        Routes.getConfig = function() {
            return clone(routesConf);
        };

        var defaultWriteSASMiddleware = function(req, res) {
            var blobName = req.body.blobName;

            var sas = Storage.Features.getWriteSASforBlob(blobName);
            conf.logger.info('sas', sas);
            res.charset = conf.charset;
            res.json({
                sas: sas,
                blobName: blobName,
                expiryTimeInMinutes: conf.SASexpiryTimeInMinutes
            });
        };

        var defaultReadSASMiddleware = function(req, res) {
            var blobName = req.body.blobName;
            var sas = Storage.Features.getReadSASforBlob(blobName);
            res.charset = conf.charset;
            res.json({
                sas: sas,
                blobName: blobName,
                expiryTimeInMinutes: conf.SASexpiryTimeInMinutes
            });
        };

        Routes.configure = function(settings) {
            settings = settings || {};
            routesConf = routesConf || {};
            routesConf.readSASroute = settings.readSASroute || routesConf.readSASroute || '/readsas';
            routesConf.writeSASroute = settings.writeSASroute || routesConf.writeSASroute || '/writesas';
            routesConf.readSASmiddleware = settings.readSASmiddleware || routesConf.readSASmiddleware || defaultReadSASMiddleware;
            routesConf.writeSASmiddleware = settings.writeSASmiddleware || routesConf.writeSASmiddleware || defaultWriteSASMiddleware;
            routesConf.CORSMiddleware = settings.CORSMiddleware || routesConf.CORSMiddleware || Storage.Features.CORSMiddleware;

            return Routes;
        };

        Routes.getRouter = function() {
            var router = express.Router();

            router.use(bodyParser.urlencoded({ extended: true }));
            router.use(bodyParser.json());

            router.all('*', routesConf.CORSMiddleware);
            router.route(routesConf.readSASroute).post(routesConf.readSASmiddleware);
            router.route(routesConf.writeSASroute).post(routesConf.writeSASmiddleware);

            return router;
        };

        Routes.resetConfiguration = function() {
            routesConf = {};
            Routes.configure();

            return Routes;
        };

        return Routes;
    })();

    Storage.setupStorageAccount = function() {
        return q.all([
            Storage.Features.setCorsProperties(),
            Storage.Features.createContainerIfNotExists()
        ]);
    };

    Storage.getConfig = function() {
        var res = clone(conf);
        res.Routes = Storage.Routes.getConfig();
        return res;
    };

    Storage.configure = function(settings) {
        conf = conf || {};
        settings = settings || {};
        conf.azureStorageAccount = settings.azureStorageAccount || conf.azureStorageAccount || process.env.SWEETAZURE_STORAGE_STORAGE_ACCOUNT || process.env.AZURE_STORAGE_ACCOUNT;
        conf.azureAccessKey = settings.azureAccessKey || conf.azureAccessKey || process.env.SWEETAZURE_STORAGE_ACCESS_KEY || process.env.AZURE_STORAGE_ACCESS_KEY;
        conf.containerName = settings.containerName || conf.containerName || process.env.SWEETAZURE_STORAGE_CONTAINER_NAME || 'sweetazure';
        conf.SASexpiryTimeInMinutes = settings.SASexpiryTimeInMinutes || conf.SASexpiryTimeInMinutes || parseInt(process.env.SWEETAZURE_STORAGE_SAS_EXPIRY_TIME_IN_MINUTES) || 60;
        conf.charset = settings.charset || conf.charset || process.env.SWEETAZURE_STORAGE_CHARSET || 'utf8';
        conf.logger = settings.logger || conf.logger || SweetAzureLogger.Configurations.Null;

        blobService = azure.createBlobService(
            conf.azureStorageAccount,
            conf.azureAccessKey,
            Storage.Features.getStorageURL()
        );

        Storage.Routes.configure(settings.Routes);

        return Storage;
    };

    Storage.resetConfiguration = function() {
        conf = {};
        Storage.configure();

        return Storage;
    };
    Storage.resetConfiguration();

    return Storage;
})();
