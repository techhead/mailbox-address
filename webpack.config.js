const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(__dirname, 'dist/umd');

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
    devtoolModuleFilenameTemplate: info => fs.existsSync(info.resourcePath)
      ? path.relative(outputPath, info.resourcePath)
      : `webpack://${info.namespace}/${info.resource}`,
    path: outputPath,
    filename: 'index.js',
    library: 'mailboxAddress',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
};
