import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Collection, decodeWork } from '../src/drive/collection.js';
import { DriveApi, conflict } from '../src/drive/api.js';
import { DriveSession } from '../src/drive/auth.js';
import { DRIVE_SCOPE } from '../src/drive/config.js';
import { validateFile } from '../src/drive/images.js';
class MemoryDrive {
    rows = new Map();
    bytes = new Map();
    count = 0;
    async create(meta) {
        const id = 'item-' + (++this.count);
        const row = { id, version: '1', ownedByMe: true, shared: false, trashed: false, createdTime: new Date(this.count * 1000).toISOString(), ...structuredClone(meta) };
        this.rows.set(id, row);
        return structuredClone(row);
    }
    async list(q) {
        const parent = q.match(/'([^']+)' in parents/)?.[1];
        return [...this.rows.values()].filter(r => !r.trashed && (!parent || r.parents.includes(parent)) &&
            [...q.matchAll(/key='(\w+)' and value='([^']+)'/g)].every(([, k, v]) => r.appProperties?.[k] === v)).map(r => structuredClone(r));
    }
    async get(id) { if (!this.rows.has(id))
        throw Error('Ausente'); return structuredClone(this.rows.get(id)); }
    async update(row, body, params = {}) {
        const r = this.rows.get(row.id);
        Object.assign(r, body);
        r.version = String(+r.version + 1);
        if (params.addParents)
            r.parents = [params.addParents];
        return this.get(row.id);
    }
    async upload(meta, blob, progress) { const r = await this.create(meta); this.bytes.set(r.id, blob); progress?.(1); return r; }
    async media(id) { return this.bytes.get(id); }
}
const details = gallery => ({ gallery, title: 'Silhueta', description: 'Luz', notes: 'Estudo de gesto', tags: ['figura'], date: '2026-11-24', favorite: true, status: 'em andamento' });
const drawing = new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });
async function open(api = new MemoryDrive()) { const c = new Collection(api); await c.initialize(); return c; }
test('estrutura inicial reutiliza IDs em outro dispositivo mesmo após renomear', async () => {
    const c = await open(), first = await c.snapshot();
    assert.equal(first.galleries.length, 4);
    const prisma = first.galleries.find(x => x.name === 'Prisma');
    await c.editGallery(prisma, 'Meu Prisma', 'Fotos e estudos', '');
    const other = await open(c.api);
    assert.equal(c.api.rows.size, 7);
    assert.equal((await other.snapshot()).galleries.find(x => x.id === prisma.id).name, 'Meu Prisma');
});
test('pastas duplicadas são sinalizadas e preservadas', async () => {
    const c = await open();
    const dup = await c.api.create({ name: 'Outro', parents: ['root'], mimeType: c.root.mimeType, appProperties: c.root.appProperties });
    const next = await open(c.api);
    assert.equal(next.root.id, c.root.id);
    assert.ok(next.warnings.size);
    assert.equal((await c.api.get(dup.id)).trashed, false);
});
test('obra mantém bytes e campos no mesmo ID durante edição, escolha de capa, movimento e lixeira', async () => {
    const c = await open();
    const [a, b] = (await c.snapshot()).galleries;
    const w = await c.add(drawing, details(a.id));
    assert.equal(await (await c.image(w)).text(), await drawing.text());
    await c.editGallery(a, 'Prisma', 'Descrição', w.id);
    assert.equal((await c.api.get(a.id)).appProperties.cover, w.id);
    const other = await open(c.api);
    assert.equal((await other.snapshot()).works[0].info.notes, 'Estudo de gesto');
    const moved = await other.edit(w, { ...details(b.id), title: 'Nova luz', favorite: false });
    assert.deepEqual(moved.parents, [b.id]);
    await assert.rejects(c.edit(w, details(a.id)));
    const updated = await other.edit(moved, { ...details(b.id), title: 'Terceira luz' });
    await assert.rejects(c.remove(moved), new RegExp(conflict));
    await other.remove(updated);
    assert.equal((await c.snapshot()).works.length, 0);
    assert.ok((await c.api.get(w.id)).trashed);
});
test('exclusão de galeria exige esvaziamento e preserva a pasta física', async () => {
    const c = await open(), g = await c.createGallery('Paletas', 'cores');
    const w = await c.add(drawing, details(g.id));
    await assert.rejects(c.removeGallery(g), /contém arquivos/);
    await c.remove(w);
    await c.removeGallery(g);
    assert.equal((await c.api.get(g.id)).trashed, false);
    assert.ok(!(await c.snapshot()).galleries.some(x => x.id === g.id));
});
test('arquivos externos, compartilhados ou com estrutura alterada ficam fora das operações', async () => {
    const c = await open(), [g] = (await c.snapshot()).galleries, w = await c.add(drawing, details(g.id));
    c.api.rows.get(w.id).shared = true;
    await assert.rejects(c.image(w));
    assert.equal((await c.snapshot()).works.length, 0);
    c.api.rows.get(w.id).shared = false;
    c.api.rows.get(g.id).appProperties.atelier = 'outro';
    await assert.rejects(c.remove(w));
});
test('metadados inválidos têm fallback explícito e formatos e datas são validados', async () => {
    const c = await open(), [g] = (await c.snapshot()).galleries;
    assert.ok(decodeWork({ description: 'texto antigo' }).damaged);
    await assert.rejects(c.add(drawing, { ...details(g.id), date: '2026-02-30' }));
    await assert.rejects(validateFile(new Blob(['falso'], { type: 'image/png' })));
    await validateFile(drawing);
});
function login(s, token = 'token-ficticio', ttl = 60) {
    let opts;
    const oauth = { initTokenClient(o) { opts = o; return { requestAccessToken() { } }; } };
    s.authorize('123-teste.apps.googleusercontent.com', oauth);
    assert.equal(opts.scope, DRIVE_SCOPE);
    assert.equal(opts.include_granted_scopes, false);
    opts.callback({ access_token: token, expires_in: ttl, scope: DRIVE_SCOPE });
    return opts;
}
test('token permanece em memória e uma sessão antiga não pode ler a nova conta', async (t) => {
    const s = new DriveSession();
    login(s);
    const api = new DriveApi(s);
    let captured;
    t.mock.method(globalThis, 'fetch', async (url, opts) => { captured = opts; return Response.json({ id: 'x' }); });
    await api.get('x');
    assert.equal(captured.headers.get('Authorization'), 'Bearer token-ficticio');
    assert.equal(captured.cache, 'no-store');
    assert.equal(captured.credentials, 'omit');
    assert.ok(!JSON.stringify(s).includes('token-ficticio'));
    s.clear();
    login(s, 'outra-conta');
    await assert.rejects(api.get('x'), { name: 'AbortError' });
    s.clear();
});
test('401, expiração e popup bloqueado exigem nova ação do artista', async (t) => {
    const s = new DriveSession();
    login(s);
    t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 401 }));
    await assert.rejects(new DriveApi(s).get('x'), /expirou/);
    assert.equal(s.connected, false);
    login(s, 'temporario', 0.001);
    await new Promise(r => setTimeout(r, 12));
    assert.ok(!s.connected);
    s.authorize('123-teste.apps.googleusercontent.com', { initTokenClient: o => ({ requestAccessToken: () => o.error_callback({ type: 'popup_failed_to_open' }) }) });
    assert.match(s.message, /pop-ups/);
});
test('paginação inclui páginas seguintes e rejeita pesquisa incompleta', async () => {
    let i = 0;
    const api = new DriveApi({ signal: new AbortController().signal, request: async (url) => {
            i++;
            return Response.json(i === 1 ? { files: [1], nextPageToken: 'outra' } : i === 2 ? { files: [2] } : { incompleteSearch: true });
        } });
    assert.deepEqual(await api.list('trashed=false'), [1, 2]);
    await assert.rejects(api.list('trashed=false'), /incompleta/);
});
test('upload envia os intervalos confirmados e testa precondição de versão quando há ETag', async () => {
    const blob = new Blob([new Uint8Array(4 * 1024 * 1024 + 10)], { type: 'image/png' }), ranges = [];
    const api = new DriveApi({ signal: new AbortController().signal, request: async (url, o) => {
            if (String(url).includes('generateIds'))
                return Response.json({ ids: ['novo'] });
            if (o.method === 'POST')
                return new Response(null, { headers: { Location: 'https://www.googleapis.com/upload/drive/v3/files?upload_id=falso' } });
            if (o.method === 'PATCH') {
                assert.equal(o.headers['If-Match'], 'etag-anterior');
                return new Response(null, { status: 412 });
            }
            ranges.push(o.headers['Content-Range']);
            return ranges.length === 1 ? new Response(null, { status: 308, headers: { Range: 'bytes=0-4194303' } }) : Response.json({ id: 'novo' });
        } });
    assert.equal((await api.upload({}, blob)).id, 'novo');
    assert.deepEqual(ranges, ['bytes 0-4194303/4194314', 'bytes 4194304-4194313/4194314']);
    await assert.rejects(api.update({ id: 'novo', etag: 'etag-anterior' }, {}), new RegExp(conflict));
});
