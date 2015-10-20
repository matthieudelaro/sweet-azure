

'use strict';

// var gulp              = require('gulp'),

//     connect = require('gulp-connect');
//     // ;,
//     // express = require('express'),
//     // minifycss = require('gulp-minify-css'),
//     // jshint = require('gulp-jshint'),
//     // uglify = require('gulp-uglify'),
//     // imagemin = require('gulp-imagemin'),
//     // rename = require('gulp-rename'),
//     // clean = require('gulp-clean'),
//     // concat = require('gulp-concat'),
//     // gettext = require('gulp-angular-gettext'),
//     // filesize = require('gulp-filesize'),
//     // templateCache = require('gulp-angular-templatecache'),
//     // ngAnnotate = require('gulp-ng-annotate'),
//     // minifyHTML = require('gulp-minify-html'),
//     // autoprefixer = require('gulp-autoprefixer'),
//     // angular_htmlify = require('gulp-angular-htmlify');

// gulp.task('connect', function() {
//   connect.server({
//     root: '.',
//     livereload: true
//   });
// });


// // gulp.task('connect', connect.server({
// //   root: ['.'],
// //   open: {browser: 'Google Chrome'}
// // }));

// gulp.task('watch', function() {
//   gulp.watch('./test.js', function() {
//     connect.reload();
//   });
// });

// gulp.task('default', ['connect', 'watch'], function () {
//   gulp.start('watch');
// });

var gulp = require('gulp'),
  connect = require('gulp-connect');

gulp.task('connect', function() {
  connect.server({
    root: __dirname + '/../',
    livereload: true
  });
});

gulp.task('html', function () {
  // gulp.src(['SweetAzure.js', 'test/index.html', 'test/test.js'])
  gulp.src(['*.*'])
    .pipe(connect.reload());
});

gulp.task('watch', function () {
  gulp.watch(['*.html', '*.js'], ['html']);
});

gulp.task('default', ['connect', 'watch']);
