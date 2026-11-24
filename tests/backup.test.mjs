import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup } from '../src/backup.js';
const meta = { id: 'one', schemaVersion: 1, createdAt: '2026-01-01T12:00:00Z', updatedAt: '2026-01-01T12:00:00Z' };
const make = () => ({ application: 'Ateliê ARTHEUS', schemaVersion: 1, records: { sheet: [{ ...meta, title: 'A flor', palette: ['#AABBCC'] }], review: [], idea: [], favorite: [], reflection: [] }, preferences: { theme: 'night', 'magia-page': 2 } });
test('preserva registros e preferências compatíveis', () => { const b = make(); assert.equal(validateBackup(b), b); });
for (const [label, change] of [
    ['versão desconhecida', b => b.schemaVersion = 7],
    ['coleção ausente', b => delete b.records.review],
    ['cor inválida', b => b.records.sheet[0].palette = ['texto']],
    ['IDs duplicados', b => b.records.sheet.push(b.records.sheet[0])],
    ['preferências desconhecidas', b => b.preferences.alheia = 1],
    ['reflexão truncada', b => b.records.reflection = [{ ...meta, checks: [false] }]],
    ['avaliação fora do intervalo', b => b.records.review = [{ ...meta, title: 'Luz', date: '2026-01-01', worked: '', next: '', free: false, scores: [1, 2, 3, 4, 6] }]]
])
    test('recusa ' + label, () => { const b = make(); change(b); assert.throws(() => validateBackup(b)); });
