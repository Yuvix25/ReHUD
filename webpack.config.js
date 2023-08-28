import path from 'path';

// import path from 'path';
// const __dirname = path.resolve();

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
    externals: {
        electron: 'commonjs electron',
    }
};
