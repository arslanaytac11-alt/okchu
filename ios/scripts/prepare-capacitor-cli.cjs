#!/usr/bin/env node
// Capacitor 6 imports tar's default export. The patched tar 7 security release
// exposes named CommonJS exports instead. Keep extraction on that patched tar.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'node_modules/@capacitor/cli');
const metadata = JSON.parse(fs.readFileSync(path.join(cli, 'package.json'), 'utf8'));
const template = path.join(cli, 'dist/util/template.js');
const tar = require(require.resolve('tar', { paths: [path.dirname(template)] }));
if (!tar.__esModule || typeof tar.default?.extract === 'function') {
    console.log('Capacitor tar import is already compatible.');
    process.exit(0);
}
if (!metadata.version.startsWith('6.') || typeof tar.extract !== 'function') {
    throw new Error('Reassess the Capacitor tar import patch for this CLI/tar version.');
}
const original = 'const tar_1 = tslib_1.__importDefault(require("tar"));';
const replacement = 'const tar_1 = { default: require("tar") };';
const source = fs.readFileSync(template, 'utf8');
if (source.includes(replacement)) {
    console.log('Capacitor 6 secure tar import patch already applied.');
} else if (source.includes(original)) {
    fs.writeFileSync(template, source.replace(original, replacement));
    console.log('Prepared Capacitor 6 CLI for the patched tar 7 export shape.');
} else {
    throw new Error('Unknown Capacitor tar import; no changes made.');
}
