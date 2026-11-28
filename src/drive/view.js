import { GOOGLE_CLIENT_ID, validClientId } from './config.js';
import { session, loadIdentity } from './auth.js';
import { DriveApi } from './api.js';
import { Collection, states } from './collection.js';
import { observeImages, resizeImage, validateFile, prepareThumbnail, persistRemoteThumbnail } from './images.js';
import { esc, heading } from '../ui.js';
import { icon } from '../icons.js';
const idKey = 'atelier-drive-client-id';
const button = (action, label, primary = false) => `<button type="button" class="btn ${primary ? 'primary' : ''}" data-action="${action}">${esc(label)}</button>`;
const attrs = (value, selected) => value === selected ? ' selected' : '';
const option = (v, label, selected) => `<option value="${esc(v)}"${attrs(v, selected)}>${esc(label)}</option>`;
function configuredId() { try {
    return GOOGLE_CLIENT_ID || localStorage.getItem(idKey) || '';
}
catch {
    return GOOGLE_CLIENT_ID;
} }
const explain = err => err instanceof TypeError ? 'Não foi possível alcançar o Google Drive. Confira a conexão e atualize o acervo.' : (err.message || 'Não foi possível concluir a operação.');
export function mountAcervo(root) {
    let alive = true, generation = 0, collection = null, data = { galleries: [], works: [], warnings: [] }, galleryId = '';
    let synced = 0, busy = false, identityReady = !!globalThis.google?.accounts?.oauth2, loadError = '';
    let unwatch = () => { }, modal = null;
    let search = '', status = '', favorites = false, order = 'desc';
    const subscriptions = new AbortController();
    const on = (el, event, fn) => el.addEventListener(event, fn, { signal: subscriptions.signal });
    const current = g => alive && generation === g;
    const selected = () => data.galleries.find(x => x.id === galleryId);
    const btns = (html) => '<div class="actions">' + html + '</div>';
    const showStatus = (text, error = false) => { const p = root.querySelector('[data-status]'); if (p) {
        p.textContent = text;
        p.classList.toggle('error', error);
    } };
    const summary = () => heading('Acervo artístico', 'Meu Acervo', 'Suas galerias de ilustração, guardadas no seu Google Drive.');
    function closeModal() {
        if (!modal)
            return;
        const old = modal;
        modal = null;
        old.alive = false;
        old.dispose();
        old.el.close();
        old.el.remove();
    }
    function clear() {
        generation++;
        closeModal();
        unwatch();
        collection = null;
        data = { galleries: [], works: [], warnings: [] };
        galleryId = '';
        search = '';
        status = '';
        favorites = false;
        order = 'desc';
        busy = false;
        synced = 0;
        root.replaceChildren();
    }
    function loggedOut() {
        const id = configuredId();
        root.innerHTML = summary() + `<section class="panel drive-connect"><span class="drive-sigil" aria-hidden="true">${icon('prism', 36)}</span>
      <h2>Conecte sua coleção</h2><p>Abra suas obras e capas em qualquer dispositivo que você autorizar com a mesma conta.</p>
      <details ${id ? '' : 'open'}><summary>Configuração do cliente Google</summary><label>Client ID público<input id="drive-client" value="${esc(id)}" autocomplete="off" placeholder="…apps.googleusercontent.com" ${GOOGLE_CLIENT_ID ? 'readonly' : ''}></label></details>
      ${btns(button('connect', 'Conectar ao Google Drive', true))}
      <p data-status role="status"></p></section>`;
        showStatus(session.message || loadError || (!navigator.onLine ? 'Sem internet. As ferramentas locais continuam disponíveis.' : 'Desconectado.'));
    }
    async function prepareGIS() {
        if (identityReady || !navigator.onLine)
            return;
        try {
            await loadIdentity();
            identityReady = true;
            loadError = '';
        }
        catch (err) {
            loadError = explain(err);
            if (alive && !session.connected)
                showStatus(loadError, true);
        }
    }
    async function connect() {
        const id = root.querySelector('#drive-client')?.value.trim() || configuredId();
        if (!validClientId(id)) {
            root.querySelector('details').open = true;
            root.querySelector('#drive-client').focus();
            throw Error('Informe o Client ID público do cliente Web do Ateliê.');
        }
        if (!GOOGLE_CLIENT_ID)
            try {
                localStorage.setItem(idKey, id);
            }
            catch { }
        if (!navigator.onLine)
            throw Error('Conecte o dispositivo à internet.');
        if (!identityReady) {
            showStatus('Carregando a autorização do Google…');
            await prepareGIS();
            if (alive && identityReady)
                showStatus('Google pronto. Toque em Conectar ao Google Drive para abrir a janela.');
            return;
        }
        session.authorize(id, undefined, '');
    }
    function frame() {
        unwatch();
        root.innerHTML = summary() + `<div class="drive-bar"><span class="drive-state">Drive conectado</span><div class="actions">${button('refresh', 'Atualizar acervo')}${button('switch', 'Trocar de conta')}${button('disconnect', 'Desconectar')}</div></div><p data-status role="status"></p><div data-warnings></div><div data-content></div>`;
        const warnings = root.querySelector('[data-warnings]');
        warnings.textContent = data.warnings.join(' ');
    }
    function cardImage(work, label) {
        return work ? `<img alt="${esc(label)}" data-preview="${esc(work.id)}">` : icon('prism', 36);
    }
    function paint() {
        if (!alive || !session.connected)
            return;
        frame();
        const target = root.querySelector('[data-content]');
        const g = selected();
        if (!g) {
            galleryId = '';
            target.innerHTML = `<div class="section-title"><h2>Galerias</h2>${button('new-gallery', 'Criar galeria', true)}</div><div class="drive-grid">${data.galleries.map(g => {
                const works = data.works.filter(w => w.parents[0] === g.id);
                const cover = works.find(w => w.id === g.appProperties.cover) || works[0];
                return `<button class="drive-card" data-action="open-gallery" data-id="${esc(g.id)}"><span class="drive-cover">${cardImage(cover, 'Capa de ' + g.name)}</span><strong>${esc(g.name)}</strong><small>${works.length} ${works.length === 1 ? 'obra' : 'obras'}</small></button>`;
            }).join('')}</div>`;
        }
        else {
            target.innerHTML = `<div class="actions">${button('back', '← Galerias')}${button('edit-gallery', 'Editar galeria')}</div>
        <div class="section-title drive-title"><div><h2>${esc(g.name)}</h2><p>${esc(g.description || '')}</p></div>${button('upload', 'Adicionar obra', true)}</div>
        <div class="drive-filters"><label>Pesquisar<input id="drive-search" type="search" value="${esc(search)}" placeholder="Título ou tag"></label><label>Status<select id="drive-filter"><option value="">Todos</option>${states.map(s => option(s, s, status)).join('')}</select></label><label>Data da obra<select id="drive-order">${option('desc', 'Mais recentes', order)}${option('asc', 'Mais antigas', order)}</select></label><label class="check"><input type="checkbox" id="drive-favs" ${favorites ? 'checked' : ''}>Favoritas</label></div><div data-works></div>`;
            paintWorks();
            return;
        }
        watch();
        syncLabel();
    }
    function syncLabel() { showStatus(busy ? 'Consultando o Drive…' : synced ? 'Atualizado às ' + new Date(synced).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '.' : ''); }
    function watch() { unwatch(); const g = generation; unwatch = observeImages(root, data.works, collection, () => current(g) && session.connected); }
    function paintWorks() {
        const wrap = root.querySelector('[data-works]');
        if (!wrap)
            return;
        const normalize = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
        const rows = data.works.filter(w => w.parents[0] === galleryId && (!status || w.info.status === status) && (!favorites || w.info.favorite) && normalize([w.name, ...w.info.tags].join(' ')).includes(normalize(search)))
            .sort((a, b) => (order === 'asc' ? 1 : -1) * (a.info.date.localeCompare(b.info.date) || a.name.localeCompare(b.name, 'pt-BR')));
        wrap.innerHTML = rows.length ? `<div class="drive-grid">${rows.map(w => `<article class="drive-card"><button class="drive-cover" data-action="view" data-id="${esc(w.id)}" aria-label="Ampliar ${esc(w.name)}">${cardImage(w, w.name)}</button><strong>${w.info.favorite ? '★ ' : ''}${esc(w.name)}</strong><small>${esc(w.info.status)} · ${esc(w.info.date)}</small>${w.damaged ? '<small>Metadados precisam de revisão.</small>' : ''}<button class="textlink" data-action="edit-work" data-id="${esc(w.id)}">Editar obra</button></article>`).join('')}</div>` : '<p class="panel">Nenhuma obra nesta seleção.</p>';
        watch();
        syncLabel();
    }
    async function refresh() {
        if (!session.connected || busy || !alive)
            return;
        const gen = generation;
        busy = true;
        showStatus('Consultando o Drive…');
        try {
            if (!collection) {
                const c = new Collection(new DriveApi(session));
                await c.initialize();
                if (!current(gen))
                    return;
                collection = c;
            }
            const next = await collection.snapshot();
            if (!current(gen))
                return;
            data = next;
            synced = Date.now();
            busy = false;
            paint();
        }
        catch (err) {
            if (current(gen)) {
                busy = false;
                showStatus(explain(err), true);
            }
        }
    }
    function changed() {
        if (!alive)
            return;
        clear();
        if (!session.connected) {
            loggedOut();
            return;
        }
        frame();
        void refresh();
    }
    function dialog(title, html, wide = false) {
        closeModal();
        const el = document.createElement('dialog');
        el.className = wide ? 'drive-dialog drive-full' : 'drive-dialog';
        el.setAttribute('aria-label', title);
        el.innerHTML = `<div class="section-title"><h2>${esc(title)}</h2><button type="button" class="icon-btn" aria-label="Fechar" data-close>${icon('close', 18)}</button></div>${html}<p role="status" data-feedback></p>`;
        root.append(el);
        const d = { el, alive: true, dispose: () => { }, saving: false };
        modal = d;
        el.querySelector('[data-close]').onclick = closeModal;
        el.oncancel = e => { e.preventDefault(); closeModal(); };
        el.showModal();
        return d;
    }
    async function commit(d, operation) {
        if (!d.alive || d.saving)
            return;
        const g = generation;
        d.saving = true;
        const feedback = d.el.querySelector('[data-feedback]');
        feedback.textContent = 'Salvando no Drive…';
        try {
            await operation(feedback);
            if (!current(g))
                return;
            if (d === modal)
                closeModal();
            // A foreground refresh may be in flight. Wait for it, then fetch the committed result.
            while (busy && current(g))
                await new Promise(resolve => setTimeout(resolve, 60));
            if (current(g))
                await refresh();
        }
        catch (err) {
            if (d.alive)
                feedback.textContent = explain(err);
        }
        finally {
            d.saving = false;
        }
    }
    function galleryForm(g) {
        const works = data.works.filter(w => w.parents[0] === g?.id);
        const d = dialog(g ? 'Editar galeria' : 'Criar galeria', `<form><label>Nome da galeria<input name="title" maxlength="180" required value="${esc(g?.name)}"></label>
      <label>Descrição<textarea name="description" maxlength="3000">${esc(g?.description)}</textarea></label>
      ${g ? `<label>Capa<select name="cover"><option value="">Primeira obra disponível</option>${works.map(w => option(w.id, w.name, g.appProperties.cover)).join('')}</select></label>` : ''}
      <div class="actions"><button class="btn primary">Salvar galeria</button>${g ? button('remove-gallery', 'Excluir galeria') : ''}</div></form>`);
        const f = d.el.querySelector('form');
        f.onsubmit = e => { e.preventDefault(); const vals = new FormData(f); void commit(d, () => g ? collection.editGallery(g, vals.get('title'), vals.get('description'), vals.get('cover')) : collection.createGallery(vals.get('title'), vals.get('description'))); };
        if (g)
            d.el.querySelector('[data-action=remove-gallery]').onclick = () => {
                if (works.length) {
                    d.el.querySelector('[data-feedback]').textContent = 'Para excluir esta galeria, use Editar obra para mover cada ilustração ou enviá-la individualmente à lixeira.';
                    return;
                }
                if (confirm('Retirar esta galeria vazia do acervo? A pasta será preservada no Drive.'))
                    void commit(d, () => collection.removeGallery(g));
            };
    }
    function workForm(work) {
        const info = work?.info || {}, today = new Date();
        const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const d = dialog(work ? 'Editar obra' : 'Adicionar obra', `<form>
      ${work ? '' : `<label>Imagem · até 32 MB<input required type="file" name="file" accept="image/png,image/jpeg,image/webp"></label><img class="upload-preview" hidden alt="Pré-visualização da obra"><label>Arquivo a enviar<select name="mode"><option value="original">Imagem original</option><option value="optimized">Otimizada · até 2560 px</option></select></label>`}
      <div class="fields"><label>Título<input name="title" required maxlength="180" value="${esc(work?.name)}"></label><label>Galeria<select name="gallery">${data.galleries.map(g => option(g.id, g.name, work?.parents[0] || galleryId)).join('')}</select></label></div>
      <label>Descrição<textarea name="description" maxlength="3000">${esc(info.description)}</textarea></label>
      <label>Tags, separadas por vírgula<input name="tags" value="${esc((info.tags || []).join(', '))}"></label>
      <div class="fields"><label>Data de criação<input type="date" name="date" required value="${esc(info.date || localDate)}"></label><label>Status<select name="status">${states.map(s => option(s, s, info.status || 'ideia')).join('')}</select></label></div>
      <label class="check"><input type="checkbox" name="favorite" ${info.favorite ? 'checked' : ''}>Favorita</label>
      <label>Anotações pessoais<textarea name="notes" maxlength="6000">${esc(info.notes)}</textarea></label>
      <div class="actions"><button class="btn primary">${work ? 'Salvar alterações' : 'Enviar ao Drive'}</button>${work ? button('remove', 'Enviar à lixeira') : ''}</div></form>`);
        let preview = '', selection = 0;
        d.dispose = () => { if (preview)
            URL.revokeObjectURL(preview); };
        const form = d.el.querySelector('form'), file = form.elements.file;
        if (file)
            file.onchange = async () => {
                const n = ++selection;
                const img = d.el.querySelector('.upload-preview');
                img.hidden = true;
                img.removeAttribute('src');
                if (preview)
                    URL.revokeObjectURL(preview);
                preview = '';
                const item = file.files[0];
                if (!item)
                    return;
                try {
                    await validateFile(item);
                    if (!d.alive || selection !== n)
                        return;
                    preview = URL.createObjectURL(item);
                    img.src = preview;
                    await img.decode();
                    if (!d.alive || selection !== n)
                        return;
                    img.hidden = false;
                    if (!form.elements.title.value)
                        form.elements.title.value = item.name.replace(/\.[^.]+$/, '');
                    d.el.querySelector('[data-feedback]').textContent = '';
                }
                catch (err) {
                    if (d.alive && selection === n) {
                        file.value = '';
                        d.el.querySelector('[data-feedback]').textContent = explain(err);
                    }
                }
            };
        form.onsubmit = e => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(form));
            f.tags = f.tags.split(',').map(x => x.trim()).filter(Boolean);
            f.favorite = form.elements.favorite.checked;
            if (work?.damaged && !confirm('Os metadados da obra estão incompletos. Substituí-los pelos valores deste formulário?'))
                return;
            void commit(d, async (feedback) => {
                if (work)
                    return collection.edit(work, f);
                const service = collection;
                await validateFile(f.file);
                const blob = f.mode === 'optimized' ? await resizeImage(f.file, 2560) : f.file;
                if (!d.alive)
                    return;
                const saved = await service.add(blob, f, p => feedback.textContent = 'Enviando… ' + Math.round(p * 100) + '%');
                // O original já foi salvo. Uma falha na miniatura não deve induzir novo upload.
                try {
                    feedback.textContent = 'Preparando miniatura…';
                    const thumb = await prepareThumbnail(service, saved, blob);
                    await persistRemoteThumbnail(service, saved, thumb);
                } catch { /* A próxima visualização tentará novamente. */ }
            });
        };
        if (work)
            d.el.querySelector('[data-action=remove]').onclick = () => {
                if (confirm('Enviar esta obra para a lixeira do Google Drive?'))
                    void commit(d, () => collection.remove(work));
            };
    }
    async function viewWork(w) {
        const d = dialog(w.name, `<img class="drive-large" alt="${esc(w.name)}" hidden><p>${esc(w.info.description)}</p>`, true);
        const feedback = d.el.querySelector('[data-feedback]');
        feedback.textContent = 'Carregando a imagem privada…';
        try {
            const blob = await collection.image(w);
            if (!d.alive)
                return;
            const url = URL.createObjectURL(blob);
            d.dispose = () => URL.revokeObjectURL(url);
            const img = d.el.querySelector('img');
            img.src = url;
            img.hidden = false;
            feedback.textContent = '';
        }
        catch (err) {
            if (d.alive)
                feedback.textContent = explain(err);
        }
    }
    root.onclick = async (e) => {
        if (e.target.closest('dialog'))
            return;
        const b = e.target.closest('[data-action]');
        if (!b)
            return;
        try {
            const a = b.dataset.action;
            if (a === 'connect')
                return await connect();
            if (a === 'disconnect')
                return session.clear('Conta desconectada.', true);
            if (a === 'switch') {
                const id = configuredId();
                if (!identityReady) {
                    showStatus('Carregando a autorização do Google…');
                    await prepareGIS();
                    if (alive)
                        showStatus(identityReady ? 'Google pronto. Toque novamente em Trocar de conta.' : loadError, !identityReady);
                    return;
                }
                return session.authorize(id, undefined, 'select_account');
            }
            if (!session.connected) {
                session.clear('Reconecte ao Google Drive.');
                return;
            }
            if (a === 'refresh')
                return await refresh();
            if (!collection || busy)
                return;
            if (a === 'back' || a === 'open-gallery') {
                galleryId = a === 'back' ? '' : b.dataset.id;
                search = '';
                status = '';
                favorites = false;
                paint();
                return;
            }
            if (a === 'new-gallery' || a === 'edit-gallery')
                return galleryForm(a === 'edit-gallery' ? selected() : null);
            if (a === 'upload')
                return workForm(null);
            const w = data.works.find(x => x.id === b.dataset.id);
            if (!w)
                return;
            if (a === 'edit-work')
                workForm(w);
            if (a === 'view')
                await viewWork(w);
        }
        catch (err) {
            if (alive)
                showStatus(explain(err), true);
        }
    };
    root.oninput = e => {
        if (e.target.closest('dialog'))
            return;
        if (e.target.id === 'drive-search')
            search = e.target.value;
        else if (e.target.id === 'drive-filter')
            status = e.target.value;
        else if (e.target.id === 'drive-order')
            order = e.target.value;
        else if (e.target.id === 'drive-favs')
            favorites = e.target.checked;
        else
            return;
        paintWorks();
    };
    const resume = () => { if (document.hidden)
        return; if (!session.connected) {
        if (collection)
            session.clear('Reconecte ao Google Drive.');
        return;
    } if (!modal && Date.now() - synced > 15000)
        void refresh(); };
    on(session, 'change', changed);
    on(window, 'focus', resume);
    on(document, 'visibilitychange', resume);
    on(window, 'online', () => { void prepareGIS(); resume(); });
    on(window, 'offline', () => showStatus('Sem internet. A sessão válida será preservada.', true));
    changed();
    void prepareGIS();
    return () => { alive = false; clear(); subscriptions.abort(); root.onclick = null; root.oninput = null; };
}
