import { conflict, quoted } from './api.js';
export const folderType = 'application/vnd.google-apps.folder';
export const types = ['image/png', 'image/jpeg', 'image/webp'];
export const states = ['ideia', 'em andamento', 'finalizada'];
const app = 'artheus-acervo-1';
const marker = (role, extra = {}) => ({ atelier: app, role, ...extra });
const managed = "appProperties has { key='atelier' and value='" + app + "' }";
const children = id => quoted(id) + ' in parents';
const valid = (file, role, parent) => file && !file.trashed && file.ownedByMe === true && file.shared !== true &&
    file.appProperties?.atelier === app && file.appProperties.role === role &&
    (role === 'work' ? types.includes(file.mimeType) : file.mimeType === folderType) &&
    (!parent || file.parents?.includes(parent));
const nameOf = value => { const name = String(value || '').trim(); if (!name || name.length > 180)
    throw Error('Use um título de 1 a 180 caracteres.'); return name; };
function textField(value, limit, label) {
    if (typeof value !== 'string' || value.length > limit)
        throw Error(label + ' excede o limite ou contém dados inválidos.');
    return value;
}
export function workInfo(input) {
    const date = input.date;
    if (!/^\d{4}-\d\d-\d\d$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
        throw Error('Informe uma data válida.');
    if (!Array.isArray(input.tags) || input.tags.length > 30 || !states.includes(input.status) || typeof input.favorite !== 'boolean')
        throw Error('Confira o status e as tags (até 30).');
    return { format: 1, description: textField(input.description, 3000, 'A descrição'), notes: textField(input.notes, 6000, 'As anotações'),
        tags: [...new Set(input.tags.map(s => textField(s, 60, 'Uma tag').trim()).filter(Boolean))], date, status: input.status, favorite: input.favorite };
}
export function decodeWork(file) {
    try {
        const raw = JSON.parse(file.description);
        if (raw.format !== 1)
            throw Error();
        return { ...file, info: workInfo(raw), damaged: false };
    }
    catch {
        return { ...file, damaged: true, info: { description: '', notes: '', tags: [], favorite: false, status: 'ideia', date: (file.createdTime || '').slice(0, 10) } };
    }
}
function encodeWork(input) {
    const description = JSON.stringify(workInfo(input));
    if (new Blob([description]).size > 24000)
        throw Error('Reduza as anotações ou as tags para caber nos metadados da obra.');
    return description;
}
export class Collection {
    constructor(api) { this.api = api; this.warnings = new Set(); }
    async ensure(parent, role, name, seed = '') {
        const query = children(parent || 'root') + ' and ' + managed + " and appProperties has { key='role' and value=" + quoted(role) + ' }' + (seed ? " and appProperties has { key='seed' and value=" + quoted(seed) + ' }' : '');
        const find = async () => (await this.api.list(query)).filter(f => valid(f, role, parent) && (!seed || f.appProperties.seed === seed))
            .sort((a, b) => a.createdTime.localeCompare(b.createdTime) || a.id.localeCompare(b.id));
        let list = await find();
        if (!list.length) {
            const made = await this.api.create({ name, mimeType: folderType, appProperties: marker(role, seed ? { seed } : {}), parents: [parent || 'root'] });
            list = await find();
            if (!list.length)
                list = [made];
        }
        if (list.length > 1)
            this.warnings.add('Há pastas duplicadas no Drive. O Ateliê usa a estrutura mais antiga e preserva as demais para revisão.');
        return list[0];
    }
    async initialize() {
        this.root = await this.ensure(null, 'root', 'Ateliê ARTHEUS');
        this.group = await this.ensure(this.root.id, 'group', 'Galerias');
        await this.ensure(this.root.id, 'data', 'Dados');
        for (const seed of ['Prisma', 'MusicArt', 'Bloodlines', 'Estudos'])
            await this.ensure(this.group.id, 'gallery', seed, seed);
    }
    async guard(id, role, parent, version) {
        const file = await this.api.get(id);
        if (!valid(file, role, parent))
            throw Error('Este item saiu da estrutura privada do Ateliê. Atualize o acervo.');
        if (version !== undefined && file.version !== version)
            throw Error(conflict);
        return file;
    }
    async tree() {
        await this.guard(this.root.id, 'root');
        return this.guard(this.group.id, 'group', this.root.id);
    }
    async gallery(id, version) {
        await this.tree();
        const item = await this.guard(id, 'gallery', this.group.id, version);
        if (item.appProperties.archived === '1')
            throw Error('A galeria foi removida. Atualize o acervo.');
        return item;
    }
    async artwork(work, version) {
        const parent = work.parents?.[0];
        await this.gallery(parent);
        return this.guard(work.id, 'work', parent, version);
    }
    async snapshot() {
        await this.tree();
        const folders = (await this.api.list(children(this.group.id) + ' and ' + managed)).filter(f => valid(f, 'gallery', this.group.id));
        const galleries = [], works = [];
        for (const g of folders) {
            const rows = (await this.api.list(children(g.id) + ' and ' + managed)).filter(f => valid(f, 'work', g.id)).map(decodeWork);
            if (g.appProperties.archived === '1') {
                if (rows.length)
                    this.warnings.add('Uma galeria removida recebeu uma obra em outro dispositivo. A pasta e a imagem foram preservadas no Drive.');
                continue;
            }
            galleries.push(g);
            works.push(...rows);
        }
        return { galleries, works, warnings: [...this.warnings] };
    }
    async createGallery(name, description = '') {
        await this.tree();
        return this.api.create({ name: nameOf(name), description: textField(description, 3000, 'A descrição'), parents: [this.group.id], mimeType: folderType, appProperties: marker('gallery') });
    }
    async editGallery(original, name, description, cover) {
        const g = await this.gallery(original.id, original.version);
        if (cover)
            await this.guard(cover, 'work', g.id);
        return this.api.update(g, { name: nameOf(name), description: textField(description, 3000, 'A descrição'), appProperties: { ...g.appProperties, cover: cover || null } });
    }
    async removeGallery(original) {
        const g = await this.gallery(original.id, original.version);
        if ((await this.api.list(children(g.id))).length)
            throw Error('Esta galeria contém arquivos. Mova cada obra para outra galeria ou remova os itens individualmente no Drive.');
        // Mark the folder as removed. drive.file cannot enumerate unrelated children that the owner moved here.
        return this.api.update(g, { appProperties: { ...g.appProperties, archived: '1' } });
    }
    async add(blob, input, progress) {
        if (!types.includes(blob.type) || !blob.size || blob.size > 32 * 1024 * 1024)
            throw Error('Use PNG, JPEG ou WebP de até 32 MB.');
        const g = await this.gallery(input.gallery);
        return this.api.upload({ name: nameOf(input.title), description: encodeWork(input), mimeType: blob.type, parents: [g.id], appProperties: marker('work') }, blob, progress);
    }
    async edit(original, input) {
        const dest = await this.gallery(input.gallery);
        const work = await this.artwork(original, original.version);
        const parent = work.parents[0];
        return this.api.update(work, { name: nameOf(input.title), description: encodeWork(input) }, parent === dest.id ? {} : { addParents: dest.id, removeParents: parent });
    }
    async remove(original) {
        const work = await this.artwork(original, original.version);
        return this.api.update(work, { trashed: true });
    }
    async image(work, signal) {
        const file = await this.artwork(work);
        if (Number(file.size) > 32 * 1024 * 1024)
            throw Error('Imagem maior que o limite de visualização de 32 MB.');
        signal?.throwIfAborted();
        const blob = await this.api.media(file.id, signal);
        if (!types.includes(blob.type) || blob.size > 32 * 1024 * 1024)
            throw Error('Formato de imagem indisponível.');
        return blob;
    }
}
