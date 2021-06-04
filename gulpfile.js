// Defining requirements
var gulp = require( 'gulp' );
var plumber = require( 'gulp-plumber' );
var sass = require( 'gulp-sass' );
var cssnano = require( 'gulp-cssnano' );
var rename = require( 'gulp-rename' );
var concat = require( 'gulp-concat' );
var uglify = require( 'gulp-uglify' );
var imagemin = require( 'gulp-imagemin' );
var ignore = require( 'gulp-ignore' );
var rimraf = require( 'gulp-rimraf' );
var sourcemaps = require( 'gulp-sourcemaps' );
var browserSync = require( 'browser-sync' ).create();
var del = require( 'del' );
var cleanCSS = require( 'gulp-clean-css' );
var replace = require( 'gulp-replace' );
var autoprefixer = require( 'gulp-autoprefixer' );

// Configuration file to keep your code DRY
var cfg = require( './gulpconfig.json' );
var paths = cfg.paths;

// Run:
// gulp sass
// Compiles SCSS files in CSS
gulp.task( 'sass', function() {
    var stream = gulp.src( `${paths.sass}/*.scss` )
        .pipe( sourcemaps.init( { loadMaps: true } ) )
        .pipe( plumber( {
            errorHandler: function( err ) {
                console.log( err );
                this.emit( 'end' );
            }
        } ) )
        .pipe( sass( { errLogToConsole: true } ) )
        .pipe( autoprefixer( 'last 2 versions' ) )
        .pipe( sourcemaps.write( './' ) )
        .pipe( gulp.dest( paths.css ) );
    return stream;
});

// Run:
// gulp watch
// Starts watcher. Watcher runs gulp sass task on changes
gulp.task( 'watch', function() {
    gulp.watch( `${paths.sass}/**/*.scss`, gulp.series('styles') );
    gulp.watch( [`${paths.dev}/js/**/*.js`, 'js/**/*.js', '!js/main.js', '!js/main.min.js'], gulp.series('scripts') );

    //Inside the watch task.
    gulp.watch( `${paths.imgsrc} /**`, gulp.series('imagemin-watch') );
});

// Run:
// gulp imagemin
// Running image optimizing task
gulp.task( 'imagemin', function(cb) {
    gulp.src( `${paths.imgsrc}/**` )
    .pipe( imagemin() )
    .pipe( gulp.dest( paths.img ) );

    cb();
});

/**
 * Ensures the 'imagemin' task is complete before reloading browsers
 * @verbose
 */
gulp.task( 'imagemin-watch', gulp.series('imagemin', function reloadBrowserSync( ) {
  browserSync.reload();
}));

// Run:
// gulp cssnano
// Minifies CSS files
gulp.task( 'cssnano', function() {
  return gulp.src( `${paths.css}/style.css` )
    .pipe( sourcemaps.init( { loadMaps: true } ) )
    .pipe( plumber( {
            errorHandler: function( err ) {
                console.log( err );
                this.emit( 'end' );
            }
        } ) )
    .pipe( rename( { suffix: '.min' } ) )
    .pipe( cssnano( { discardComments: { removeAll: true } } ) )
    .pipe( sourcemaps.write( './' ) )
    .pipe( gulp.dest( paths.css ) );
});

gulp.task( 'minifycss', function() {
  return gulp.src( paths.css + '/style.css' )
  .pipe( sourcemaps.init( { loadMaps: true } ) )
    .pipe( cleanCSS( { compatibility: '*' } ) )
    .pipe( plumber( {
            errorHandler: function( err ) {
                console.log( err ) ;
                this.emit( 'end' );
            }
        } ) )
    .pipe( rename( { suffix: '.min' } ) )
     .pipe( sourcemaps.write( './' ) )
    .pipe( gulp.dest( paths.css ) );
});

gulp.task( 'cleancss', function() {
  return gulp.src( `${paths.css}/*.min.css`, { read: false } ) // Much faster
    .pipe( ignore( 'style.css' ) )
    .pipe( rimraf() );
});

gulp.task( 'styles', gulp.series( 'sass', 'minifycss' ));

// Run:
// gulp browser-sync
// Starts browser-sync task for starting the server.
gulp.task( 'browser-sync', function() {
    browserSync.init( cfg.browserSyncWatchFiles, cfg.browserSyncOptions );
} );

// Run:
// gulp scripts.
// Uglifies and concat all JS files into one
gulp.task( 'scripts', function() {
  gulp.src( [`${paths.dev}/js/*.js`, `!${paths.dev}/js/custom-javascript.js`], { allowEmpty: true })
    .pipe( uglify() )
    .pipe(rename({ suffix: '.min' }))
    .pipe( gulp.dest( paths.js ) );

    gulp.src( [`${paths.dev}/js/*.js`, `!${paths.dev}/js/custom-javascript.js`], { allowEmpty: true })
    .pipe( gulp.dest( paths.js ) );
    
  gulp.src( `${paths.dev}/js/custom-javascript.js`, { allowEmpty: true } )
    .pipe( concat( 'main.min.js' ) )
    .pipe( uglify() )
    .pipe( gulp.dest( paths.js ) );

  return gulp.src( `${paths.dev}/js/custom-javascript.js`, { allowEmpty: true } )
    .pipe( concat( 'main.js' ) )
    .pipe( gulp.dest( paths.js ) );
});

// Run:
// gulp watch-bs
// Starts watcher with browser-sync. Browser-sync reloads page automatically on your browser
gulp.task( 'watch-bs', gulp.parallel('browser-sync', 'watch', 'scripts'));

// Deleting any file inside the /src folder
gulp.task('clean-source', function () {
  return del(['src/**/*']);
});


// Deleting any file inside the /dist folder
gulp.task( 'clean-dist', function() {
  return del( [`${paths.dist}/**`] );
});

// Run
// gulp dist
// Copies the files to the /dist folder for distribution as simple theme
gulp.task( 'dist', gulp.series('clean-dist', function copyToDistFolder() {
    const ignore = [`!${paths.bower}`, `!${paths.bower}/**`, `!${paths.node}`, `!${paths.node}/**`, `!${paths.dev}`, `!${paths.dev}/**`, `!${paths.dist}`, `!${paths.dist}/**`, `!${paths.distprod}`, `!${paths.distprod}/**`, `!${paths.sass}`, `!${paths.sass}/**`, '!readme.txt', '!readme.md', '!package.json', '!package-lock.json', '!gulpfile.js', '!gulpconfig.json', '!CHANGELOG.md', '!.travis.yml', '!jshintignore',  '!codesniffer.ruleset.xml', '!_README.md', '!composer.json', '!gulpconfig.json' ];

    console.log({ ignore })

  return gulp.src( ['**/*', ...ignore], { 'buffer': false } )
    .pipe( gulp.dest( paths.dist ) );
}));

// Deleting any file inside the /dist-product folder
gulp.task( 'clean-dist-product', function() {
  return del( [`${paths.distprod}/**`] );
} );

// Run
// gulp dist-product
// Copies the files to the /dist-prod folder for distribution as theme with all assets
gulp.task( 'dist-product', gulp.series('clean-dist-product', function copyToDistFolder() {
  return gulp.src( ['**/*', `!${paths.bower}`, `!${paths.bower}/**`, `!${paths.node}`, `!${paths.node}/**`, `!${paths.dist}`, `!${paths.dist}` +'/**', `!${paths.distprod}`, `!${paths.distprod}/**`, '*'] )
    .pipe( gulp.dest( paths.distprod ) );
} ));

// Deleting any file inside the /dist-product folder
gulp.task( 'compile', gulp.series( 'styles', 'scripts', 'dist' ));

// Run:
// gulp build
// Build SASS, CSS, images and Javascript
gulp.task( 'build', gulp.series( 'sass', 'minifycss', 'imagemin', 'scripts' ));
