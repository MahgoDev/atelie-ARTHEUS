import { fields, finishes, categories } from './content.js';
import { esc, heading, btn, options, history, toast, copy, download } from './ui.js';
import { db } from './data.js';
import { icon } from './icons.js';
function markdown(row) {
    const blocks = [['Categoria', row.category], ...fields.map(([k, label]) => [label, row[k]]), ['Paleta de cores', row.palette?.join(' · ')], ['Acabamento', row.finish]];
    return '# ' + row.title + '\n\n' + blocks.filter(([, v]) => v).map(([l, v]) => '## ' + l + '\n' + v).join('\n\n') + '\n';
}
export async function sheets(root, id) {
    const records = await db.list('sheet');
    if (!id) {
        root.innerHTML = heading('Criação', 'Ficha de Criação', 'Uma ficha pode começar com um título. O restante cresce com a ideia.') + `<a class="btn primary" href="#/ficha/nova">${icon('plus', 18)} Nova ficha</a><section class="panel"><h2>Minhas fichas</h2>${history(records, 'ficha', 'Sua primeira ficha aparecerá aqui assim que receber um título.')}</section>`;
        return;
    }
    const existing = records.find(r => r.id === id);
    if (!existing && id !== 'nova') {
        root.innerHTML = '<p>Ficha não encontrada. <a href="#/ficha">Voltar às fichas</a></p>';
        return;
    }
    const row = existing ? { ...existing, palette: [...(existing.palette || [])] } : { id: crypto.randomUUID(), title: '', palette: [] };
    const area = ([key, label]) => `<label>${label}<textarea name="${key}" rows="2">${esc(row[key])}</textarea></label>`;
    const group = (title, list) => `<section class="panel"><h2>${title}</h2><div class="fields">${list.map(area).join('')}</div></section>`;
    root.innerHTML = heading('Criação', existing ? 'Editar ficha' : 'Nova ficha', 'Guarde as escolhas que dão forma à sua ilustração.') + `<a class="textlink" href="#/ficha">← Minhas fichas</a>
 <form id="sheet-form"><section class="panel"><div class="section-title"><h2>Primeira faísca</h2><small role="status" id="save-state"></small></div><div class="fields"><label>Título provisório<input name="title" required value="${esc(row.title)}" placeholder="Como você chamaria essa ideia?"></label><label>Categoria<input name="category" list="sheet-categories" value="${esc(row.category)}" placeholder="Escolha ou escreva uma categoria"></label></div><datalist id="sheet-categories">${[...new Set([...categories, ...records.map(r => r.category).filter(Boolean)])].map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist></section>
 ${group('Intenção e narrativa', fields.slice(0, 7))}${group('Direção de arte', fields.slice(7, 10))}
 <section class="panel"><h2>Paleta e acabamento</h2><div id="colors"></div>${btn('plus', 'Adicionar cor', 'color')}<label class="spaced">Nível de acabamento<select name="finish">${options(Object.keys(finishes), row.finish, 'Deixar em aberto')}</select></label><p class="hint" id="finish-note"></p></section>
 ${group('Caderno de notas', fields.slice(10))}<div class="actions">${btn('check', 'Salvar ficha', 'save', true)}${btn('copy', 'Duplicar', 'duplicate')}${btn('download', 'Exportar Markdown', 'export')}${btn('book', 'Imprimir', 'print')}${btn('trash', 'Excluir', 'delete')}</div></form>`;
    const form = root.querySelector('form'), state = root.querySelector('#save-state');
    // A single queue preserves the order of rapid edits and finishes before duplication or deletion.
    let pending = Promise.resolve(), deleting = false;
    const save = () => {
        Object.assign(row, Object.fromEntries(new FormData(form)));
        row.title = row.title.trim();
        if (!row.title) {
            state.textContent = 'Dê um título para salvar.';
            return pending;
        }
        if (deleting)
            return pending;
        const snapshot = { ...row, palette: [...row.palette] };
        state.textContent = 'Salvando…';
        pending = pending.catch(() => { }).then(() => db.save('sheet', snapshot)).then(() => {
            state.textContent = 'Salvo neste dispositivo';
            if (root.isConnected && location.hash === '#/ficha/nova')
                window.history.replaceState(null, '', '#/ficha/' + row.id);
        }).catch(err => { state.textContent = 'Falha ao salvar'; toast('Não foi possível salvar. Exporte sua ficha para guardar o texto.'); throw err; });
        pending.catch(() => { });
        return pending;
    };
    function palette() {
        root.querySelector('#colors').innerHTML = row.palette.map((v, i) => `<div class="swatch"><input aria-label="Editar cor ${i + 1}" type="color" value="${esc(v)}" data-color="${i}"><button type="button" data-copy="${i}" title="Copiar código HEX">${esc(v)}</button><button type="button" data-drop="${i}" aria-label="Remover cor ${i + 1}">×</button></div>`).join('');
    }
    function finish() { root.querySelector('#finish-note').textContent = finishes[form.elements.finish.value] || 'Cada acabamento atende a uma intenção diferente.'; }
    palette();
    finish();
    state.textContent = existing ? 'Salvo neste dispositivo' : 'Aguardando um título';
    form.oninput = e => {
        if (e.target.matches('[data-color]')) {
            const i = Number(e.target.dataset.color);
            row.palette[i] = e.target.value.toUpperCase();
            root.querySelector('[data-copy="' + i + '"]').textContent = row.palette[i];
        }
        finish();
        save();
    };
    form.onsubmit = e => { e.preventDefault(); save(); };
    form.onclick = async (e) => {
        const b = e.target.closest('button');
        if (!b)
            return;
        if (b.hasAttribute('data-copy'))
            return copy(row.palette[b.dataset.copy]);
        if (b.hasAttribute('data-drop')) {
            row.palette.splice(Number(b.dataset.drop), 1);
            palette();
            save();
            return;
        }
        const a = b.dataset.action;
        if (a === 'color') {
            row.palette.push('#B49AD8');
            palette();
            save();
            return;
        }
        if (a === 'delete') {
            if (confirm('Excluir esta ficha deste dispositivo?')) {
                deleting = true;
                await pending.catch(() => { });
                await db.remove('sheet', row.id);
                location.hash = '/ficha';
            }
            return;
        }
        if (!form.reportValidity() || !form.elements.title.value.trim()) {
            form.elements.title.focus();
            return;
        }
        if (a === 'export') {
            download((form.elements.title.value.trim().replace(/[\\/:*?"<>|]/g, '-') || 'Ficha') + '.md', markdown(row), 'text/markdown;charset=utf-8');
            return;
        }
        if (a === 'print') {
            const print = document.createElement('article');
            print.className = 'print-sheet';
            const blocks = [['Categoria', row.category], ...fields.map(([key, label]) => [label, row[key]]), ['Paleta de cores', row.palette.join(' · ')], ['Acabamento', row.finish]];
            print.innerHTML = '<h1>' + esc(row.title) + '</h1>' + blocks.filter(([, value]) => value).map(([label, value]) => '<section><h2>' + esc(label) + '</h2><p>' + esc(value) + '</p></section>').join('');
            document.body.append(print);
            const cleanup = () => print.remove();
            window.addEventListener('afterprint', cleanup, { once: true });
            window.print();
            return;
        }
        await save();
        if (a === 'save')
            toast('Ficha salva.');
        if (a === 'duplicate') {
            const duplicate = await db.save('sheet', { ...row, id: crypto.randomUUID(), title: row.title + ' (cópia)' });
            location.hash = '/ficha/' + duplicate.id;
        }
    };
}
