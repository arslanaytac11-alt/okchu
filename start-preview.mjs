// Keep the local preview independent of the terminal that starts it.
import { spawn } from 'node:child_process';
import { mkdirSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('.', import.meta.url));
const url = 'http://127.0.0.1:5188/?kontrol=1';
async function ready() {
    try {
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(500) });
        return response.ok && response.headers.get('X-Okchu-Preview') === '1';
    } catch { return false; }
}
if (await ready()) {
    console.log(url);
} else {
    mkdirSync(new URL('outputs/', import.meta.url), { recursive: true });
    const log = openSync(new URL('outputs/preview-server.log', import.meta.url), 'a');
    const child = spawn(process.execPath, [fileURLToPath(new URL('preview-server.mjs', import.meta.url))], {
        cwd: root, detached: true, stdio: ['ignore', log, log],
    });
    closeSync(log);
    child.on('error', error => { console.error(error.message); process.exitCode = 1; });
    child.unref();
    if (child.pid) writeFileSync(new URL('outputs/preview-server.pid', import.meta.url), String(child.pid));
    let started = false;
    for (let attempt = 0; attempt < 30; attempt++) {
        await delay(100);
        if (await ready()) { started = true; break; }
    }
    if (started) console.log(url);
    else {
        console.error('Preview did not start. See outputs/preview-server.log.');
        process.exitCode = 1;
    }
}
