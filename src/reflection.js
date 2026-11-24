import { db } from './data.js';
import { esc, btn, heading, history, options, toast } from './ui.js';
import { criteria, questions } from './content.js';
import { icon } from './icons.js';
function radar(values) {
    const pos = (i, r) => { const a = i * Math.PI * 2 / 5 - Math.PI / 2; return [150 + Math.cos(a) * r, 128 + Math.sin(a) * r]; };
    const ring = (scores) => scores.map((v, i) => pos(i, 77 * v / 5).join(',')).join(' ');
    const labels = [[150, 26], [242, 99], [221, 218], [78, 218], [58, 99]];
    return `<svg class="radar" viewBox="0 0 300 245" role="img" aria-label="${esc(criteria.map(([name], i) => name + ' ' + values[i] + ' de 5').join(', '))}"><g fill="none" stroke="var(--line)">${[1, 2, 3, 4, 5].map(n => `<polygon points="${ring(Array(5).fill(n))}"/>`).join('')}${criteria.map((_, i) => `<line x1="150" y1="128" x2="${pos(i, 77)[0]}" y2="${pos(i, 77)[1]}"/>`).join('')}</g><polygon points="${ring(values)}" fill="var(--accent)" fill-opacity=".24" stroke="var(--accent)" stroke-width="2"/>${values.map((v, i) => `<circle cx="${pos(i, 77 * v / 5)[0]}" cy="${pos(i, 77 * v / 5)[1]}" r="3.5" fill="var(--accent)"/>`).join('')}${criteria.map(([l], i) => `<text x="${labels[i][0]}" y="${labels[i][1]}" text-anchor="middle" fill="var(--text)" font-size="12">${l}</text>`).join('')}</svg>`;
}
export async function reviews(root, id) {
    const rows = await db.list('review');
    if (!id) {
        root.innerHTML = heading('Desenvolvimento', 'Avaliação Artística', 'Revisite uma obra a partir das suas próprias intenções.') + `<a class="btn primary" href="#/avaliacao/nova">${icon('plus', 18)} Nova avaliação</a><section class="panel"><h2>Minhas avaliações</h2>${history(rows, 'avaliacao', 'As reflexões sobre suas obras ficarão aqui.')}</section>`;
        return;
    }
    const old = rows.find(r => r.id === id);
    if (!old && id !== 'nova') {
        root.innerHTML = '<p>Avaliação não encontrada. <a href="#/avaliacao">Voltar</a></p>';
        return;
    }
    const now = new Date(), today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const row = old || { id: crypto.randomUUID(), scores: [3, 3, 3, 3, 3], date: today };
    const scores = row.scores || [3, 3, 3, 3, 3];
    root.innerHTML = heading('Desenvolvimento', old ? 'Editar avaliação' : 'Nova avaliação', 'O gráfico registra sua percepção desta obra. Cada critério pode contar uma história diferente.') + `<a class="textlink" href="#/avaliacao">← Minhas avaliações</a><form><section class="panel"><div class="fields"><label>Título da obra<input name="title" required value="${esc(row.title)}"></label><label>Data<input type="date" required name="date" value="${esc(row.date)}"></label></div><label class="check spaced"><input type="checkbox" name="free" ${row.free ? 'checked' : ''}>Reflexão livre, sem notas</label></section>
 <section class="panel rating-grid" id="rating"><div>${criteria.map(([name, prompt], i) => `<label class="slider"><span><strong>${name}</strong><output>${scores[i]}</output></span><small>${prompt}</small><input type="range" min="1" max="5" value="${scores[i]}" data-score="${i}"></label>`).join('')}</div><div id="radar"></div></section>
 <section class="panel"><h2>Palavras sobre a obra</h2><div class="fields"><label>O que funcionou?<textarea name="worked">${esc(row.worked)}</textarea></label><label>O que quero experimentar na próxima obra?<textarea name="next">${esc(row.next)}</textarea></label></div></section><div class="actions"><button class="btn primary" type="submit">${icon('check', 17)}Salvar avaliação</button>${old ? btn('trash', 'Excluir avaliação', 'delete') : ''}</div></form>`;
    const form = root.querySelector('form');
    function update() { root.querySelector('#rating').hidden = form.free.checked; root.querySelector('#radar').innerHTML = radar(scores); }
    update();
    form.oninput = e => { if (e.target.hasAttribute('data-score')) {
        scores[e.target.dataset.score] = Number(e.target.value);
        e.target.closest('label').querySelector('output').value = e.target.value;
    } update(); };
    form.onsubmit = async (e) => {
        e.preventDefault();
        const title = form.elements.namedItem('title').value.trim();
        if (!title)
            return toast('Escreva um título para identificar a obra.');
        await db.save('review', { id: row.id, title, date: form.date.value, free: form.free.checked, scores: form.free.checked ? null : scores, worked: form.worked.value, next: form.next.value });
        location.hash = '/avaliacao';
        toast('Avaliação salva.');
    };
    form.onclick = async (e) => { if (e.target.closest('[data-action="delete"]') && confirm('Excluir esta avaliação?')) {
        await db.remove('review', row.id);
        location.hash = '/avaliacao';
    } };
}
export async function filter(root) {
    const [rows, sheets] = await Promise.all([db.list('reflection'), db.list('sheet')]);
    const row = rows.find(r => r.id === 'current') || { id: 'current', checks: Array(5).fill(false), note: '', sheetId: '' };
    root.innerHTML = heading('Desenvolvimento', 'Filtro Criativo', 'Antes de começar uma ilustração, reserve um instante para escutar a ideia.') + `<section class="panel"><h2>Antes de começar</h2><p>Não precisa marcar todas as opções. Use essas perguntas para perceber o que está motivando suas escolhas.</p><div class="checklist">${questions.map((q, i) => `<label class="check"><input type="checkbox" data-check="${i}" ${row.checks[i] ? 'checked' : ''}><span>${esc(q)}</span></label>`).join('')}</div></section><section class="panel"><div class="fields"><label>Anotação opcional<textarea id="reflection-note">${esc(row.note)}</textarea></label><label>Associar a uma ficha<select id="reflection-sheet"><option value="">Sem vínculo</option>${sheets.map(s => `<option value="${esc(s.id)}" ${s.id === row.sheetId ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select></label></div></section><div class="actions">${btn('back', 'Reiniciar reflexão', 'reset')}<small role="status"></small></div>`;
    let pending = Promise.resolve();
    function save() {
        const snapshot = { ...row, checks: [...row.checks] };
        const status = root.querySelector('[role=status]');
        status.textContent = 'Salvando…';
        pending = pending.catch(() => { }).then(() => db.save('reflection', snapshot)).then(() => status.textContent = 'Reflexão salva neste dispositivo').catch(() => { status.textContent = 'Falha ao salvar a reflexão.'; });
        return pending;
    }
    root.oninput = e => {
        if (e.target.hasAttribute('data-check'))
            row.checks[e.target.dataset.check] = e.target.checked;
        else if (e.target.id === 'reflection-note')
            row.note = e.target.value;
        else if (e.target.id === 'reflection-sheet')
            row.sheetId = e.target.value;
        save();
    };
    root.querySelector('[data-action=reset]').onclick = async () => { if (!confirm('Limpar as marcações, a anotação e o vínculo desta reflexão?'))
        return; row.checks.fill(false); row.note = ''; row.sheetId = ''; root.querySelectorAll('[data-check]').forEach(el => el.checked = false); root.querySelector('#reflection-note').value = ''; root.querySelector('#reflection-sheet').value = ''; await save(); };
}
