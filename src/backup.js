import { fields } from './content.js';
import { kinds, schemaVersion, db, preferences, pref, setPref, restorePreferences } from './data.js';
import { heading, btn, download, toast } from './ui.js';
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const str = x => typeof x === 'string';
const optional = x => x === undefined || str(x);
const stamp = x => str(x) && Number.isFinite(Date.parse(x));
const textFields = fields.map(([key]) => key).concat('category', 'finish', 'ideaId');
function valid(kind, row) {
    if (!plain(row) || !str(row.id) || !row.id.trim() || !stamp(row.createdAt) || !stamp(row.updatedAt) || row.schemaVersion !== 1)
        return false;
    if (kind === 'favorite')
        return /^(book-\d+|idea-.+)$/.test(row.id);
    if (kind === 'reflection')
        return Array.isArray(row.checks) && row.checks.length === 5 && row.checks.every(v => typeof v === 'boolean') && str(row.note) && str(row.sheetId);
    if (!str(row.title) || !row.title.trim())
        return false;
    if (kind === 'sheet')
        return textFields.every(k => optional(row[k])) && (row.palette === undefined || Array.isArray(row.palette) && row.palette.every(v => str(v) && /^#[0-9a-f]{6}$/i.test(v)));
    if (kind === 'idea')
        return str(row.idea) && str(row.category);
    return str(row.date) && /^\d{4}-\d\d-\d\d$/.test(row.date) && stamp(row.date) && str(row.worked) && str(row.next) && typeof row.free === 'boolean' && (row.free ? row.scores === null : Array.isArray(row.scores) && row.scores.length === 5 && row.scores.every(n => Number.isInteger(n) && n >= 1 && n <= 5));
}
/** @returns {import('../types/records').Backup} */
export function validateBackup(data) {
    if (!plain(data) || data.application !== 'Ateliê ARTHEUS' || data.schemaVersion !== schemaVersion || !plain(data.records) || !plain(data.preferences))
        throw Error('Escolha um backup do Ateliê ARTHEUS no formato da versão 1.');
    if (Object.keys(data.records).some(kind => !kinds.includes(kind)))
        throw Error('O arquivo contém uma coleção desconhecida.');
    for (const kind of kinds) {
        const rows = data.records[kind];
        if (!Array.isArray(rows) || !rows.every(row => valid(kind, row)) || new Set(rows.map(r => r.id)).size !== rows.length)
            throw Error('O backup contém registros inválidos ou repetidos.');
    }
    for (const [key, value] of Object.entries(data.preferences)) {
        if (key === 'theme' && ['night', 'paper'].includes(value))
            continue;
        if (['magia-page', 'grimorio-page'].includes(key) && Number.isInteger(value) && value >= 0)
            continue;
        throw Error('O arquivo contém preferências incompatíveis.');
    }
    return data;
}
export function settings(root, theme) {
    root.innerHTML = heading('Ateliê', 'Configurações', 'Escolha o papel do seu grimório e cuide dos registros que vivem neste navegador.') + `<section class="panel"><h2>Aparência</h2><label>Tema<select id="theme-choice"><option value="night">Grimório Noturno</option><option value="paper">Grimório de Papel</option></select></label></section>
 <section class="panel"><h2>Backup do Ateliê</h2><p>Fichas, avaliações, reflexões, ideias e favoritos ficam neste navegador e dispositivo. A limpeza dos dados do site pode apagá-los. Exporte uma cópia para guardar seus registros ou levá-los a outro aparelho.</p><div class="actions">${btn('download', 'Exportar backup JSON', 'export', true)}<label class="btn file-input">Importar backup<input type="file" accept="application/json,.json" id="import-backup"></label></div><p id="backup-state" role="status"></p></section><section class="panel"><h2>Instalar o Ateliê</h2><p>No Safari do iPhone ou iPad, abra o menu de compartilhamento e escolha a opção de adicionar à Tela de Início. No computador, use a opção de instalar do navegador, quando disponível. Depois do primeiro carregamento completo, os módulos ficam disponíveis offline.</p></section>`;
    const sel = root.querySelector('#theme-choice');
    sel.value = pref('theme', 'night');
    sel.onchange = () => theme(sel.value);
    const status = root.querySelector('#backup-state');
    root.querySelector('[data-action=export]').onclick = async () => {
        const data = { application: 'Ateliê ARTHEUS', schemaVersion, exportedAt: new Date().toISOString(), records: await db.dump(), preferences: preferences() };
        download('atelie-artheus-' + data.exportedAt.slice(0, 10) + '.json', JSON.stringify(data, null, 2), 'application/json');
        status.textContent = 'Backup preparado para download.';
    };
    root.querySelector('#import-backup').onchange = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file)
            return;
        try {
            const data = validateBackup(JSON.parse(await file.text()));
            const count = kinds.reduce((n, k) => n + data.records[k].length, 0);
            if (!confirm('Restaurar ' + count + ' registro(s) e as preferências deste backup? Os dados atuais do Ateliê neste navegador serão substituídos.')) {
                status.textContent = 'Restauração cancelada.';
                return;
            }
            const oldPreferences = preferences();
            try {
                restorePreferences(data.preferences);
                await db.restore(data.records);
            }
            catch (error) {
                restorePreferences(oldPreferences);
                throw error;
            }
            sel.value = pref('theme', 'night');
            theme(sel.value);
            status.textContent = 'Backup restaurado. Seus registros estão disponíveis no Ateliê.';
        }
        catch (error) {
            status.textContent = error instanceof SyntaxError ? 'O arquivo não contém um JSON válido.' : error.message;
        }
    };
}
