var browserify = require('browserify');
var gulp = require('gulp');
var less = require('gulp-less');
var lessify = require('node-lessify');
var notify = require('gulp-notify');
var rename = require('gulp-rename');
var reactify = require('reactify');
var babelify = require('babelify');
var streamify = require('gulp-streamify');
var uglify = require('gulp-uglify');
var source = require('vinyl-source-stream');
var webserver = require('gulp-webserver');

// Define some paths.
var paths = {
  app_js: ['./src/js/app.js'], // 'entry point'
  js: ['./src/js/**/*.js'],
  less_files: ['./src/style/style.less'],
  build: './dist/',
  style: './dist/style/',
  src_style: './src/style/',
  scripts: './src/js/',
  src: './src/',
  bundle: 'bundle.js'
};

// Our CSS task. It finds all our Less files and compiles them.
gulp.task('less', function() {
  gulp.src(paths.less_files)
    .pipe(less())
    .pipe(gulp.dest(paths.style));
});

gulp.task('copy', function() {
  gulp.src(paths.src + 'index.html').pipe(gulp.dest(paths.build));
  gulp.src('assets/**/*').pipe(gulp.dest(paths.build + 'assets/'));
  gulp.src(paths.src_style + 'default-theme/**/*').pipe(gulp.dest(paths.build + 'themes/default/'));
});

// Build
function buildJS(file) {

  var props = {
    entries: [file],
    debug : true,
    transform: [reactify, babelify, lessify]
  };

  var bundler = browserify(props);

  function rebundle() {
    var stream = bundler.bundle();

    return stream
      .on('error', catchErrors)
      .pipe(source(file))
      .pipe(streamify(uglify()))
      .pipe(rename(paths.bundle))
      .pipe(gulp.dest(paths.build));
  }

  return rebundle();
}

gulp.task('js', function() {
  buildJS(paths.app_js[0])
});

function catchErrors() {
  var args = Array.prototype.slice.call(arguments);
  notify.onError({
    title: 'Compile Error',
    message: '<%= error.message %>'
  }).apply(this, args);
  this.emit('end'); // Keep gulp from hanging on this task
}

// Rerun tasks whenever a file changes.
gulp.task('watch', function() {
  try {
    gulp.watch(paths.less_files, ['less']);
    gulp.watch(paths.js, ['js']);
  } catch(e) {
    console.log(e);
  }
});

// Static server
gulp.task('serve', function() {
  gulp.src('dist')
    .pipe(webserver({
      port: 8080,
      host: '0.0.0.0'
    }));
});

gulp.task('default', ['watch', 'js', 'less', 'copy', 'serve']);
gulp.task('build', ['js', 'less', 'copy']);
gulp.task('server', ['serve']);
