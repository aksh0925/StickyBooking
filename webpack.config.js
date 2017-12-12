const webpack = require('webpack');
const path = require('path');

module.exports = {

  // the project dir
  context: __dirname,
  entry: {

    // See use of 'vendor' in the CommonsChunkPlugin inclusion below.
    vendor: [
      // Below libraries are listed as entry points to be sure they get included in the
      // vendor-bundle.js. Note, if we added some library here, but don't use it in the
      // app-bundle.js, then we just wasted a bunch of space.
      'active-resource',
      'angular',
      'angular-sanitize',
      'angular-spinner',
      'axios',
      'es6-promise',
      'jquery',
      'moment',
      'moment-range',
      'qs',
      'occasion-sdk',
      'underscore',
      'underscore.inflection',
      'underscore.string'
    ],

    app: [
      './src/startup',
    ],
  },

  output: {
    filename: 'sticky_booking-[name]_bundle.js',
    path: __dirname + '/lib/assets/javascripts/'
  },

  plugins: [
    // https://webpack.github.io/docs/list-of-plugins.html#2-explicit-vendor-chunk
    new webpack.optimize.CommonsChunkPlugin({

      // This name 'vendor' ties into the entry definition
      name: 'vendor',

      // Passing Infinity just creates the commons chunk, but moves no modules into it.
      // In other words, we only put what's in the vendor entry definition in vendor-bundle.js
      minChunks: Infinity,
    }),
  ],

  resolve: {
    extensions: ['.css', '.js'],
    alias: {
      libs: path.join(process.cwd(), 'src', 'libs'),
      'active-resource': path.join(process.cwd(), 'node_modules', 'active-resource', 'build', 'active-resource.min.js')
    },
  },

  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ],
      },
      {
        test: /\.html$/,
        use: 'html-loader'
      },
      {
        test: require.resolve('jquery'),
        loader: 'expose-loader?$'
      },
    ],
  },

};
