const gulp         = require('gulp');
// Utility
const browserSync  = require('browser-sync');
const cached       = require('gulp-cached');
const changed      = require('gulp-changed');
const del          = require('del');
const fs           = require('fs');
const minimist     = require('minimist');
const notify       = require('gulp-notify');
const plumber      = require('gulp-plumber');
const rename       = require('gulp-rename');
// HTML
const beautify     = require('gulp-html-beautify');
const nunjucks     = require('gulp-nunjucks-render');
// CSS
const autoprefixer = require('autoprefixer');
const cssnano      = require('cssnano');
const mqpacker     = require('css-mqpacker');
const postcss      = require('gulp-postcss');
const progeny      = require('gulp-progeny');
const sass         = require('gulp-sass');
// JavaScript
const babel        = require('gulp-babel');
// Images
const imagemin     = require('gulp-imagemin');
const mozjpeg      = require('imagemin-mozjpeg');
const pngquant     = require('imagemin-pngquant');

const argv = minimist(process.argv, {
  default: { env: process.env.NODE_ENV || 'production' },
  string: 'env',
});
const isDevelopment = argv.env === 'development';
const isProduction  = argv.env === 'production';

const src = {
  root  : 'src/',
  data  : 'src/data/site.json',
  views : 'src/views/**/*.njk',
  html  : 'src/**/!(_)*.njk',
  css   : 'src/assets/css/**/*.scss',
  js    : 'src/assets/js/**/*.js',
  images: 'src/assets/images/**/*.*',
  static: 'src/static/**/*.*',
};
const dest = {
  root  : 'dist/',
  css   : 'dist/assets/css/',
  js    : 'dist/assets/js/',
  images: 'dist/assets/images/',
};

let json = {};

function clean() {
  return del(dest.root);
}

function data() {
  return gulp.src(src.data)
    .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
    .pipe(cached())
    .on('data', () => {
      json = JSON.parse(fs.readFileSync(src.data));
      delete cached.caches.html;
    });
}

function views() {
  return gulp.src(src.views)
    .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
    .pipe(cached())
    .on('data', () => {
      delete cached.caches.html;
    });
}

function html() {
  return gulp.src(src.html)
    .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
    .pipe(cached('html'))
    .pipe(nunjucks({
      data: json,
      path: src.root,
    }))
    .pipe(beautify({
      end_with_newline: true,
      extra_liners: [],
      indent_size: 2,
      max_preserve_newlines: 0,
    }))
    .pipe(gulp.dest(dest.root))
    .pipe(browserSync.stream());
}

function css() {
  return gulp.src(src.css, { sourcemaps: isDevelopment })
    .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
    .pipe(cached())
    .pipe(progeny())
    .pipe(sass())
    .pipe(postcss([
      autoprefixer({ grid: true }),
      cssnano(),
      mqpacker({ sort: true }),
    ]))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(dest.css, { sourcemaps: isDevelopment }))
    .pipe(browserSync.stream());
}

function js() {
  return gulp.src(src.js, { sourcemaps: isDevelopment })
    .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
    .pipe(cached())
    .pipe(babel({ presets: ['@babel/preset-env', 'minify'] }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(dest.js, { sourcemaps: isDevelopment }))
    .pipe(browserSync.stream());
}

function images() {
  return gulp.src(src.images)
    .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
    .pipe(changed(dest.images))
    .pipe(imagemin([
      imagemin.gifsicle(),
      imagemin.svgo(),
      mozjpeg({ quality: 80 }),
      pngquant({ quality: 80, speed: 1 }),
    ]))
    .pipe(gulp.dest(dest.images))
    .pipe(browserSync.stream());
}

function static() {
  return gulp.src(src.static)
    .pipe(gulp.dest(dest.root))
    .pipe(browserSync.stream());
}

function serve(done) {
  browserSync.init({ server: dest.root });
  gulp.watch(src.data, gulp.series(data, html));
  gulp.watch(src.views, gulp.series(views, html));
  gulp.watch(src.html, html);
  gulp.watch(src.css, css);
  gulp.watch(src.js, js);
  gulp.watch(src.images, images);
  gulp.watch(src.static, static);
  done();
}

if (isProduction) {
  exports.default = gulp.series(clean, data, html, css, js, images, static);
} else {
  exports.default = gulp.series(data, serve);
}
