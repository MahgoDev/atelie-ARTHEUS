import assert from 'node:assert/strict';
import { renderReading } from '../src/reading.js';
import { grimorio, magia } from '../src/editorial.js';
assert.equal(grimorio.length, 24);
assert.equal(magia.length, 13);
assert.equal(grimorio[13].blocks.at(-1).list.length, 10);
assert.equal(magia.at(-1).blocks.at(-1).quote, 'Eu tenho liberdade para criar.');
const node = { focus() { }, scrollIntoView() { } };
const shell = { classList: { toggle() { } }, setAttribute() { }, removeAttribute() { }, querySelector: () => node };
globalThis.document = { createElement: () => shell };
globalThis.window = { matchMedia: () => ({ matches: false }) };
const root = { replaceChildren() { } }, prefs = new Map(), favorites = new Map();
let clipboard = '';
const ctx = { esc: String, pref: (k, f) => prefs.get(k) ?? f, setPref: (k, v) => prefs.set(k, v), copy: t => clipboard = t, toast() { }, db: {
        list: async () => [...favorites.values()], save: async (_, v) => favorites.set(v.id, v), remove: async (_, id) => favorites.delete(id)
    } };
function click(dataset) {
    return shell.onclick({ target: { closest: () => ({ disabled: false, dataset, hasAttribute: () => dataset.page !== undefined }) } });
}
await renderReading(root, 'grimorio', ctx);
await click({ page: '4' });
assert.match(shell.innerHTML, /read-dna-core/);
await click({ page: '3' });
assert.match(shell.innerHTML, /read-journey/);
await click({ action: 'copy' });
assert.match(clipboard, /Pertencimento/);
await renderReading(root, 'magia', ctx);
assert.match(shell.innerHTML, /Um lembrete de quem sou quando desenho/);
await click({ action: 'next' });
assert.match(shell.innerHTML, /A chave/);
await click({ action: 'favorite' });
assert.ok(favorites.has('book-1'));
await click({ action: 'focus' });
assert.match(shell.innerHTML, /Sair da leitura focada/);
shell.onkeydown({ key: 'Escape' });
assert.match(shell.innerHTML, /Leitura focada/);
await renderReading(root, 'magia', ctx);
assert.match(shell.innerHTML, /Não preciso pedir permissão/);
await click({ action: 'random' });
assert.notEqual(prefs.get('magia-page'), 1);
await click({ page: '1' });
await click({ action: 'favorite' });
assert.equal(favorites.size, 0);
await click({ page: '12' });
assert.match(shell.innerHTML, /Eu tenho liberdade para criar/);
console.log('Leitura: índice, navegação, persistência de posição, sorteio, favoritos, cópia, modo focado, diagramas e textos verificados.');
