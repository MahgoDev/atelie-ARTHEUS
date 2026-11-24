import { db } from './data.js';
import { seeds, ideaCategories } from './content.js';
import { esc, heading, btn, options, toast, randomOther } from './ui.js';
import { icon } from './icons.js';
export async function ideas(root) {
    let category = '', onlyFavorites = false, spot = '', editing = null;
    const [own, favs] = await Promise.all([db.list('idea'), db.list('favorite')]);
    const favorites = new Set(favs.map(f => f.id));
    function render() {
        const all = [...own, ...seeds];
        let list = all.filter(x => (!category || x.category === category) && (!onlyFavorites || favorites.has('idea-' + x.id)));
        const featured = list.find(x => x.id === spot);
        if (featured)
            list = [featured, ...list.filter(x => x !== featured)];
        root.innerHTML = heading('Criação', 'Banco de Ideias', 'Propostas criativas para interpretar do seu jeito. Guarde as que despertam sua curiosidade.') + `<div class="actions">${btn('plus', 'Criar ideia', 'new', true)}${btn('dice', 'Sortear uma ideia', 'random')}</div><div class="panel slim fields"><label>Categoria<select id="category">${options(ideaCategories, category, 'Todas as categorias')}</select></label><label class="check"><input type="checkbox" id="only-favs" ${onlyFavorites ? 'checked' : ''}>Somente favoritas</label></div>
 ${editing ? `<form class="panel" id="idea-form"><h2>${editing.id ? 'Editar ideia' : 'Minha ideia'}</h2><div class="fields"><label>Título<input required maxlength="240" name="title" value="${esc(editing.title)}"></label><label>Categoria<select name="category">${options(ideaCategories, editing.category, 'Sem categoria')}</select></label><label class="full">Ideia<textarea name="idea" required>${esc(editing.idea)}</textarea></label></div><div class="actions"><button class="btn primary" type="submit">Salvar ideia</button>${btn('close', 'Cancelar', 'cancel')}</div></form>` : ''}
 <div class="ideas-grid">${list.map(x => { const isOwn = own.some(o => o.id === x.id), saved = favorites.has('idea-' + x.id); return `<article class="panel idea-card ${featured === x ? 'selected' : ''}" data-id="${esc(x.id)}"><div class="section-title"><span class="eyebrow">${esc(x.category || 'Ideia própria')}</span><button class="icon-btn" data-action="favorite" aria-label="${saved ? 'Remover dos favoritos' : 'Favoritar ideia'}" aria-pressed="${saved}">${icon('bookmark', 18)}</button></div><h2>${esc(x.title)}</h2><p>${esc(x.idea)}</p><div class="actions">${btn('pen', 'Transformar em ficha', 'convert')}${isOwn ? btn('pen', 'Editar', 'edit') + btn('trash', 'Excluir', 'delete') : ''}</div></article>`; }).join('') || '<p>Nenhuma ideia para esta seleção.</p>'}</div>`;
        root.querySelector('#category').onchange = e => { category = e.target.value; spot = ''; render(); };
        root.querySelector('#only-favs').onchange = e => { onlyFavorites = e.target.checked; spot = ''; render(); };
        const form = root.querySelector('form');
        if (form)
            form.onsubmit = async (e) => { e.preventDefault(); const input = Object.fromEntries(new FormData(form)); input.title = input.title.trim(); input.idea = input.idea.trim(); if (!input.title || !input.idea)
                return toast('Preencha o título e a ideia.'); const r = await db.save('idea', { ...editing, ...input }); const idx = own.findIndex(x => x.id === r.id); if (idx >= 0)
                own.splice(idx, 1); own.unshift(r); category = ''; onlyFavorites = false; spot = r.id; editing = null; render(); toast('Ideia salva.'); };
        root.onclick = async (e) => {
            const b = e.target.closest('[data-action]');
            if (!b)
                return;
            const a = b.dataset.action, id = b.closest('[data-id]')?.dataset.id, x = all.find(i => i.id === id);
            if (a === 'new' || a === 'edit') {
                editing = a === 'new' ? { category } : x;
                render();
                root.querySelector('[name=title]').focus();
                return;
            }
            if (a === 'cancel') {
                editing = null;
                render();
                return;
            }
            if (a === 'random') {
                if (!list.length)
                    return toast('Nenhuma ideia disponível nesta seleção.');
                spot = randomOther(list, spot)?.id;
                render();
                root.querySelector('.selected')?.scrollIntoView({ block: 'center' });
                return;
            }
            if (a === 'favorite') {
                const key = 'idea-' + id;
                if (favorites.has(key)) {
                    await db.remove('favorite', key);
                    favorites.delete(key);
                }
                else {
                    await db.save('favorite', { id: key });
                    favorites.add(key);
                }
                render();
                return;
            }
            if (a === 'delete' && confirm('Excluir esta ideia?')) {
                await db.remove('idea', id);
                favorites.delete('idea-' + id);
                own.splice(own.findIndex(r => r.id === id), 1);
                editing = null;
                render();
                return;
            }
            if (a === 'convert') {
                b.disabled = true;
                try {
                    const row = await db.save('sheet', { title: x.title, idea: x.idea, category: x.category, palette: [], ideaId: id });
                    location.hash = '/ficha/' + row.id;
                    toast('Ficha criada a partir da ideia.');
                } finally { b.disabled = false; }
            }
        };
    }
    render();
}
