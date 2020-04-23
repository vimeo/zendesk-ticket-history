/* eslint-env node */
var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var extractStyles = new ExtractTextPlugin('main.css');
var HtmlWebpackPlugin = require('html-webpack-plugin');

var externalAssets = {
  css: [
    'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css'
  ],
  js: [
    'https://cdn.jsdelivr.net/g/lodash@4.14.0,jquery@3.1.0',
    'https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.7.2/handlebars.runtime.min.js',
    'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.17.1/moment-with-locales.min.js',
    'https://assets.zendesk.com/apps/sdk/2.0/zaf_sdk.js',
  ]
};

module.exports = {
  progress: true,
  entry: {
    app: ['./src/javascripts/index.js', './src/stylesheets/app.scss']
  },
  output: {
    path: './dist/assets',
    filename: 'main.js',
    sourceMapFilename: '[file].map'
  },
  module: {
    preLoaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader'
      }
    ],
    loaders: [
      {
        test: /\.scss$/,
        loader: extractStyles.extract("style", ["css?sourceMap", "sass?sourceMap"])
      },
      {
        test: /\.json$/,
        exclude: /src\/translations\/.*\.json/,
        loader: 'json-loader'
      },
      {
        test: /src\/translations\/.*\.json/,
        loader: 'translations-loader',
        query: {
          runtime: 'handlebars'
        }
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
      },
      {
        test: /\.(handlebars|hd?bs)$/,
        loader: 'handlebars-loader',
        query: {
          extensions: ['handlebars', 'hdbs', 'hbs'],
          runtime: 'handlebars'
        }
      }
    ]
  },
  resolveLoader: {
    modulesDirectories: ['./lib/loaders', 'node_modules']
  },
  resolve: {
    modulesDirectories: ['node_modules', './lib/javascripts'],
    alias: {
      'app_manifest': path.join(__dirname, './dist/manifest.json')
    },
    extensions: ['', '.js']
  },
  externalAssets: externalAssets,
  externals: {
    handlebars: 'Handlebars',
    jquery: 'jQuery',
    lodash: '_',
    moment: 'moment',
    zendesk_app_framework_sdk: 'ZAFClient'
  },
  devtool: '#eval',
  plugins: [
    extractStyles,
    new HtmlWebpackPlugin({
      warning: 'AUTOMATICALLY GENERATED FROM ./lib/templates/layout.hdbs - DO NOT MODIFY THIS FILE DIRECTLY',
      vendorCss: externalAssets.css,
      vendorJs: externalAssets.js,
      template: '!!handlebars!./lib/templates/layout.hdbs'
    }),
    new webpack.optimize.UglifyJsPlugin({
      comments: false,
      compress: {
        drop_debugger: false,
        warnings: false,
        drop_console: true
      }
    })
  ]
};
