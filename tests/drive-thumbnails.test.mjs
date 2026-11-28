import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Collection } from '../src/drive/collection.js';
class MemoryDrive {
    signal = new AbortController().signal;
    downloads = [];
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
    async upload(meta, blob, progress) { const r = await this.create({ ...meta, size: String(blob.size) }); this.bytes.set(r.id, blob); progress?.(1); return r; }
    async media(id) { this.downloads.push(id); return this.bytes.get(id); }
}
const details = gallery => ({ gallery, title: 'Silhueta', description: 'Luz', notes: 'Estudo de gesto', tags: ['figura'], date: '2026-11-24', favorite: true, status: 'em andamento' });
const drawing = new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });
async function open(api = new MemoryDrive()) { const c = new Collection(api); await c.initialize(); return c; }

test('miniatura privada em Dados, reutilizada por outro dispositivo sem baixar original', async () => {
    const c = await open(), [g] = (await c.snapshot()).galleries;
    const w = await c.add(drawing, details(g.id));
    const thumb = new Blob(['RIFF0000WEBP'], {type:'image/webp'});
    assert.equal(await c.saveRemoteThumbnail(w, thumb), true);
    const folder = await c.thumbnailFolder();
    assert.deepEqual(folder.parents, [c.data.id]);
    const rows = [...c.api.rows.values()].filter(f => f.appProperties.role === 'thumbnail');
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].parents, [folder.id]);
    assert.equal(rows[0].shared, false);
    const other = await open(c.api);
    assert.equal(await other.saveRemoteThumbnail(w, thumb), true);
    assert.equal([...c.api.rows.values()].filter(f => f.appProperties.role === 'thumbnail').length, 1);
    assert.equal(await (await other.readRemoteThumbnail(w)).text(), await thumb.text());
    assert.deepEqual(c.api.downloads, [rows[0].id]);
    assert.equal((await other.snapshot()).works.length, 1);
    assert.equal(await c.api.bytes.get(w.id).text(), await drawing.text());
});

test('mudança de metadados reutiliza checksum; troca de conteúdo invalida miniatura', async () => {
    const c = await open(), [g] = (await c.snapshot()).galleries;
    let w = await c.add(drawing, details(g.id));
    c.api.rows.get(w.id).md5Checksum = 'checksum-a';
    w = await c.api.get(w.id);
    await c.saveRemoteThumbnail(w, drawing);
    w = await c.edit(w, {...details(g.id), title:'Novo título'});
    assert.ok(await c.readRemoteThumbnail(w));
    c.api.rows.get(w.id).md5Checksum = 'checksum-b';
    c.api.rows.get(w.id).version = '3';
    assert.equal(await c.readRemoteThumbnail(await c.api.get(w.id)), null);
});

test('miniaturas compartilhadas são ignoradas e originais compartilhados são recusados', async () => {
    const c = await open(), [g] = (await c.snapshot()).galleries;
    const w = await c.add(drawing, details(g.id));
    await c.saveRemoteThumbnail(w, drawing);
    const item = [...c.api.rows.values()].find(f => f.appProperties.role === 'thumbnail');
    item.shared = true;
    assert.equal(await c.readRemoteThumbnail(w), null);
    c.api.rows.get(w.id).shared = true;
    await assert.rejects(c.readRemoteThumbnail(w));
    await assert.rejects(c.saveRemoteThumbnail(w, drawing));
});
