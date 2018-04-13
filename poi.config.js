const pkg = require('./package.json');
const path = require('path');
const process = require('process');
const GoogleFontsPlugin = require('google-fonts-webpack-plugin');

module.exports = {
  // Entry is relative to process.cwd()
  entry: [
    'src/startup',
  ],

  html: {
    template: 'index.html'
  },

  dist: 'lib/assets',

  presets: [
    require('poi-preset-resolve-alias')({
      'active-resource': path.join(process.cwd(), 'node_modules', 'active-resource', 'build', 'active-resource.min.js'),
      'occasion-sdk': path.join(process.cwd(), 'node_modules', 'occasion-sdk', 'build', 'occasion-sdk.min.js'),
    })
  ],

  filename: {
    js: 'javascripts/' + pkg.name + '-[name]_bundle.js',
    css: 'stylesheets/' + pkg.name + '-[name]_bundle.css',
    images: 'images/[name].[ext]',
    fonts: 'fonts/[name].[ext]',
  },

  webpack(config) {
    config.module.rules.push(
      { test: require.resolve('jquery'), use: 'expose-loader?jQuery' },
      { test: require.resolve('jquery'), use: 'expose-loader?$' },
      { test: /\.nghtml/, use: [
        { loader: 'ngtemplate-loader' },
        { loader: 'html-loader' }
      ]}
    );

    config.plugins.push(new GoogleFontsPlugin({
      fonts: [
        { family: 'Lato', variants: [ '300', '400', '700', '900' ] }
      ]
    }));

    return config;
  }
};
