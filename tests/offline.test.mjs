import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { writeWorker } from '../scripts/build.mjs';
test('o worker pré-carrega o app, atende o hash offline e troca somente seu próprio cache', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'artheus-offline-'));
    try {
        await writeFile(path.join(dir, 'index.html'), '<p>Ateliê</p>');
        await writeFile(path.join(dir, 'app.js'), 'export {}');
        await writeWorker(dir);
        const scope = 'https://exemplo.invalid/Atelie-ARTHEUS/', events = {}, stored = new Map([['cache-de-outro-app', new Map()]]), files = new Map([['./index.html', 'Ateliê'], ['./app.js', 'export {}']]);
        const caches = {
            async open(name) { if (!stored.has(name))
                stored.set(name, new Map()); const s = stored.get(name); return { async addAll(requests) { for (const req of requests)
                    s.set(req.url, files.get(req.url)); }, async match(req) { return s.get(req.url || req); } }; },
            async keys() { return [...stored.keys()]; }, async delete(name) { return stored.delete(name); }
        };
        class Request {
            constructor(url) { this.url = url; }
        }
        const context = { self: { registration: { scope }, addEventListener: (n, h) => events[n] = h, skipWaiting: async () => { }, clients: { claim: async () => { } } }, Request, caches, fetch: () => { throw Error('Offline'); } };
        function waitFor(name) { return new Promise((yes, no) => events[name]({ waitUntil: p => p.then(yes, no) })); }
        const run = async () => { vm.runInNewContext(await readFile(path.join(dir, 'sw.js'), 'utf8'), { ...context }); await waitFor('install'); await waitFor('activate'); };
        await run();
        const first = [...stored.keys()].find(s => s.startsWith('artheus-'));
        const offline = await new Promise((yes, no) => events.fetch({ request: { method: 'GET', url: scope + '#/ficha', mode: 'navigate' }, respondWith: p => p.then(yes, no) }));
        assert.equal(offline, 'Ateliê');
        await writeFile(path.join(dir, 'app.js'), 'export const v=2');
        await writeWorker(dir);
        await run();
        assert.equal(stored.has(first), false);
        assert.ok(stored.has('cache-de-outro-app'));
    }
    finally {
        await rm(dir, { recursive: true, force: true });
    }
});
