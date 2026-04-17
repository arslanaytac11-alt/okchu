// Copy PWA static files into www/ for Capacitor to bundle.
// Run: node build-www.mjs  (or automatic via `npm run cap:sync`)
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const WWW = 'www';

if (existsSync(WWW)) await rm(WWW, { recursive: true, force: true });
await mkdir(WWW, { recursive: true });

const entries = [
    'index.html',
    'manifest.json',
    'sw.js',
    'privacy.html',
    'terms.html',
    'css',
    'js',
    'lang',
    'assets',
];

for (const entry of entries) {
    if (!existsSync(entry)) {
        console.warn(`skip missing: ${entry}`);
        continue;
    }
    await cp(entry, `${WWW}/${entry}`, { recursive: true });
    console.log(`copied: ${entry}`);
}
console.log(`\nwww/ ready for Capacitor.`);
