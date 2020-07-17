const path = require('path');

module.exports = {
  entry: './src/index.ts',
  resolve: {
    extensions: [ '.ts', '.js' ],
  },
  module: {
    rules: [
      { test: /\.ts$/, use: 'ts-loader' }
    ],
  },
  node: false, // Don't polyfill for Node.
  devtool: 'nosources-source-map',
  output: {
    path: path.resolve(__dirname, 'dist/umd'),
    filename: 'index.js',
    library: 'mailboxAddress',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
};
