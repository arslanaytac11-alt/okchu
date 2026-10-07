import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Compile and execute the exact production Swift geometry, with no UIKit mock.
// Runs on the macOS native-development host; no simulator or private API needed.
const directory = mkdtempSync(join(tmpdir(), 'okchu-duo-viewport-'));
try {
    const binary = join(directory, 'duo-viewport-tests');
    const compile = spawnSync('xcrun', ['--sdk', 'macosx', 'swiftc', '-parse-as-library',
        resolve('ios/App/App/DuoViewport.swift'), resolve('tests/duo-viewport.swift'), '-o', binary],
        { encoding: 'utf8', timeout: 30000 });
    if (compile.status !== 0) throw new Error(compile.error?.message || compile.stderr || compile.stdout);
    const run = spawnSync(binary, [], { encoding: 'utf8', timeout: 15000 });
    if (run.status !== 0) throw new Error(run.error?.message || run.stderr || run.stdout);
    process.stdout.write(run.stdout);
} finally {
    rmSync(directory, { recursive: true, force: true });
}
