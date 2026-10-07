// Local browser preview. Public game files only; no build or account credentials.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const port = 5188;
const folders = new Set(['assets', 'css', 'js', 'lang']);
const pages = new Set(['index.html', 'sw.js', 'manifest.json', 'privacy.html', 'terms.html', 'support.html']);
const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
};

const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Okchu-Preview', '1');
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        response.end();
        return;
    }
    try {
        const pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
        const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
        const parts = relative.split('/');
        if (parts.includes('..') || relative.includes('\\') ||
            !(pages.has(relative) || folders.has(parts[0]))) {
            response.writeHead(404);
            response.end();
            return;
        }
        const file = resolve(root, relative);
        if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) {
            response.writeHead(404);
            response.end();
            return;
        }
        response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
        if (request.method === 'HEAD') { response.end(); return; }
        createReadStream(file).on('error', () => response.destroy()).pipe(response);
    } catch (error) {
        response.writeHead(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 400);
        response.end();
    }
});
server.on('error', error => {
    console.error(`Okchu preview could not start: ${error.message}`);
    process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Okchu: http://127.0.0.1:${port}/?kontrol=1`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
