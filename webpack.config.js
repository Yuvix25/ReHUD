import path from 'path';
import webpackNodeExternals from 'webpack-node-externals';

export default {
  entry: {
    index: './wwwroot/js/index.js',
    settings: './wwwroot/js/settingsPage.js',
  },
  output: {
    filename: '[name]-bundle.js',
    path: path.resolve('wwwroot', 'dist'),
  },
  target: 'node',
  mode: 'production',
  externals: [{ electron: 'commonjs electron' }, webpackNodeExternals({
    allowlist: [/^(?!(ws)$).*$/], // all modules except 'ws' should be bundled
  })],
};
