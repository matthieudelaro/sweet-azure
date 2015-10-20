'use strict';

(function(SweetAzure){
    var q = Q;

    // config
    SweetAzure.configure({
        logger: console,
        backend: {
            URL: 'http://localhost:5030'
        }
    });

    console.log($("#fileForm"));
    $("#fileForm").on('change', function(data) {
        console.log('upload:', JSON.stringify($("#fileForm")[0].files[0]));
        console.log('upload:', $("#fileForm")[0].files[0]);
        SweetAzure.upload({
            file : {"webkitRelativePath":"","lastModified":1426891775000,"lastModifiedDate":"2015-03-20T22:49:35.000Z","name":"testFile.txt","type":"text/plain","size":10}
            // file: $("#fileForm")[0].files[0]
            // getSAS: function(that) {
            //     var deferred = q.defer();
            //     deferred.resolve({
            //         blobName : "fakeBlobName",
            //         sas : "https://fake.sas",
            //         expiryTimeInMinutes: 100
            //     });
            //     console.log('getSAS called');
            //     return deferred.promise;
            // }
        }).then(function(data) {
            console.log('success:', data);
        }, function(err) {
            console.log('error:', err);
        }, function(data) {
            console.log('update:', data);
        });
    });
    console.log(SweetAzure);

})(SweetAzure);
