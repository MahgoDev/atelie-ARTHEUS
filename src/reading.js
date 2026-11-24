import { grimorio, magia } from './editorial.js';
const symbols = {
    chave: '<path d="M44 46l-22 22v7h7v-5h6v-6l15-15"/><circle cx="55" cy="37" r="14"/><path d="M49 37l6-6 6 6-6 6z"/>',
    prisma: '<path d="M47 19L19 65l29 10 31-12L47 19zm0 0l1 56m-29-10 29-13 31 11"/><path d="m74 40 12-5m-9 11 13-1"/>',
    espelho: '<ellipse cx="48" cy="42" rx="21" ry="26"/><ellipse cx="48" cy="42" rx="17" ry="21"/><path d="m45 68-1 10q4 4 8 0l-1-10m-16-22 17-21m-12 23 17-21"/>',
    fio: '<path d="M10 58c15 0 14-26 28-26 18 0 20 32 2 32-16 0-11-30 8-30 20 0 21 36 37 11"/><circle cx="10" cy="58" r="2"/><circle cx="85" cy="45" r="2"/>',
    flor: '<path d="M48 68c-2-10-7-16-14-24m14 24c2-10 7-16 14-24M48 70v11"/><path d="M48 23c7-12 18 0 11 10 14-2 19 12 4 16 4 14-12 18-15 5-5 13-20 8-16-5-15-3-11-18 4-16-7-12 6-21 12-10z"/><circle cx="48" cy="40" r="5"/>',
    portal: '<path d="M23 74V44a25 25 0 0 1 50 0v30M30 74V44a18 18 0 0 1 36 0v30M17 75h62m-46-1 15-13 15 13"/><path d="m49 31 2 7 6 2-6 2-2 7-2-7-6-2 6-2z"/>',
};
function ornament(name) {
    return `<svg class="read-ornament" viewBox="0 0 96 88" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[name] || symbols.prisma}</svg>`;
}
const dnaLabels = [
    ['Narrativa', 'visual'], ['Cores', 'expressivas'], ['Cabelos e', 'expressões'],
    ['Pintura', 'estilizada'], ['Moda e', 'personalidade'], ['Atmosfera', 'e magia'],
];
function dna() {
    const nodes = [[180, 36], [284, 91], [284, 201], [180, 256], [76, 201], [76, 91]];
    const spokes = nodes.map(([x, y]) => `<path d="M180 146L${x} ${y}"/>`).join('');
    const labels = nodes.map(([x, y], i) => `<g transform="translate(${x} ${y})"><rect x="-61" y="-22" rx="18" width="122" height="44"/><text y="-2">${dnaLabels[i][0]}<tspan x="0" dy="16">${dnaLabels[i][1]}</tspan></text></g>`).join('');
    return `<svg class="read-dna" viewBox="0 0 360 294" role="img" aria-label="ARTHEUS no centro do DNA visual, ligado a narrativa visual, cores expressivas, cabelos e expressões, pintura estilizada, moda e personalidade, atmosfera e magia."><g class="read-lines">${spokes}<circle cx="180" cy="146" r="70" stroke-dasharray="2 6"/></g>${labels}<circle class="read-dna-core" cx="180" cy="146" r="41"/><text x="180" y="151" class="read-dna-name">ARTHEUS</text></svg>`;
}
function content(section, esc) {
    return section.blocks.map(block => {
        if (typeof block === 'string')
            return `<p>${esc(block)}</p>`;
        if (block.h)
            return `<h3>${esc(block.h)}</h3>`;
        if (block.quote)
            return `<blockquote>${esc(block.quote)}</blockquote>`;
        if (block.list) {
            const tag = block.numbered ? 'ol' : 'ul';
            return `<${tag}>${block.list.map(line => `<li>${esc(line)}</li>`).join('')}</${tag}>`;
        }
        if (block.dna)
            return dna();
        if (block.journey)
            return '<ol class="read-journey" aria-label="Jornada emocional"><li>Encantamento</li><li>Curiosidade</li><li>Conexão</li><li>Pertencimento</li></ol>';
        return '';
    }).join('');
}
function sectionText(section) {
    return [section.title, ...section.blocks.flatMap(block => {
            if (typeof block === 'string')
                return block;
            if (block.list)
                return block.list.map((s, i) => block.numbered ? `${i + 1}. ${s}` : `• ${s}`);
            if (block.dna)
                return dnaLabels.map(pair => pair.join(' ')).join(' · ');
            if (block.journey)
                return 'Encantamento → Curiosidade → Conexão → Pertencimento';
            return block.quote || block.h || [];
        })].join('\n\n');
}
export async function renderReading(root, route, ctx) {
    const { esc, pref, setPref, db, copy, toast } = ctx;
    const book = route === 'magia';
    const sections = book ? magia : grimorio;
    const title = book ? 'A Magia de Criar' : 'Meu Grimório';
    const key = book ? 'magia-page' : 'grimorio-page';
    let page = Math.max(0, Math.min(sections.length - 1, Number(pref(key, 0)) || 0));
    page = Math.floor(page);
    let focused = false;
    const favorites = new Set();
    const reader = document.createElement('section');
    reader.className = book ? 'read-shell read-book' : 'read-shell read-grimorio';
    root.replaceChildren(reader);
    if (book) {
        try {
            for (const row of await db.list('favorite')) {
                if (/^book-\d+$/.test(row.id))
                    favorites.add(row.id);
            }
        }
        catch {
            toast('Não foi possível carregar os favoritos deste dispositivo.');
        }
    }
    function draw() {
        const section = sections[page];
        const favorite = favorites.has(`book-${page}`);
        reader.classList.toggle('read-focused', focused);
        reader.setAttribute('aria-label', title);
        if (focused) {
            reader.setAttribute('role', 'dialog');
            reader.setAttribute('aria-modal', 'true');
        }
        else {
            reader.removeAttribute('role');
            reader.removeAttribute('aria-modal');
        }
        reader.innerHTML = `
      <div class="read-head"><div><span class="read-kicker">Ateliê ARTHEUS · Leitura</span><h1>${title}</h1></div>
      ${book ? `<button type="button" data-action="focus" aria-pressed="${focused}">${focused ? 'Sair da leitura focada' : 'Leitura focada'}</button>` : ''}</div>
      <div class="read-layout"><details class="read-index"><summary>Índice <span aria-hidden="true">⌄</span></summary><nav aria-label="Capítulos de ${title}">
      ${sections.map((s, i) => `<button type="button" data-page="${i}" ${i === page ? 'aria-current="page"' : ''}><span>${String(i + 1).padStart(2, '0')}</span>${esc(s.title)}</button>`).join('')}</nav></details>
      <div class="read-main"><article class="read-leaf">
        <div class="read-leaf-top"><span>${book ? 'Minibook' : 'Dossiê artístico'}</span><span>${page + 1} / ${sections.length}</span></div>
        ${ornament(section.symbol)}
        ${section.caption ? `<div class="read-caption">${esc(section.caption)}</div>` : ''}
        <h2 tabindex="-1">${esc(section.title)}</h2>
        <div class="read-body">${content(section, esc)}</div>
        <div class="read-leaf-end" aria-hidden="true">✧</div>
      </article>
      <div class="read-controls">
        <button type="button" data-action="prev" ${page === 0 ? 'disabled' : ''}>← Voltar</button>
        <span aria-live="polite">Página ${page + 1} de ${sections.length}</span>
        <button type="button" data-action="next" ${page === sections.length - 1 ? 'disabled' : ''}>Avançar →</button>
      </div>
      <div class="read-actions">
        <button type="button" data-action="copy">Copiar texto</button>
        ${book ? `<button type="button" data-action="favorite" aria-pressed="${favorite}">${favorite ? '♥ Mensagem favorita' : '♡ Favoritar mensagem'}</button><button type="button" data-action="random">Sortear mensagem</button>` : ''}
      </div>
      ${book && favorites.size ? `<details class="read-saved"><summary>Minhas mensagens favoritas</summary><div>${sections.map((s, i) => favorites.has(`book-${i}`) ? `<button type="button" data-page="${i}">${esc(s.title)}</button>` : '').join('')}</div></details>` : ''}
      </div></div>`;
        if (window.matchMedia('(min-width: 1100px)').matches)
            reader.querySelector('.read-index').open = true;
    }
    function go(next) {
        page = Math.max(0, Math.min(sections.length - 1, next));
        setPref(key, page);
        draw();
        const heading = reader.querySelector('h2');
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ block: 'nearest' });
    }
    reader.onkeydown = event => {
        if (!focused)
            return;
        if (event.key === 'Escape') {
            focused = false;
            draw();
            reader.querySelector('[data-action="focus"]').focus();
        }
        if (event.key === 'Tab') {
            const buttons = [...reader.querySelectorAll('button:not(:disabled)')].filter(item => item.offsetWidth);
            const first = buttons[0], last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    };
    reader.onclick = async (event) => {
        const button = event.target.closest('button');
        if (!button || button.disabled)
            return;
        const action = button.dataset.action;
        if (button.hasAttribute('data-page'))
            return go(Number(button.dataset.page));
        if (action === 'prev')
            return go(page - 1);
        if (action === 'next')
            return go(page + 1);
        if (action === 'random') {
            const options = sections.map((s, i) => s.message && i !== page ? i : -1).filter(i => i >= 0);
            if (options.length)
                go(options[Math.floor(Math.random() * options.length)]);
            return;
        }
        if (action === 'focus') {
            focused = !focused;
            draw();
            reader.querySelector('[data-action="focus"]').focus();
            return;
        }
        try {
            if (action === 'copy') {
                await copy(sectionText(sections[page]));
                return;
            }
            if (action === 'favorite') {
                const id = `book-${page}`;
                button.disabled = true;
                if (favorites.has(id)) {
                    await db.remove('favorite', id);
                    favorites.delete(id);
                }
                else {
                    await db.save('favorite', { id });
                    favorites.add(id);
                }
                draw();
                reader.querySelector('[data-action="favorite"]').focus({ preventScroll: true });
            }
        }
        catch {
            button.disabled = false;
            toast('Não foi possível concluir a ação. Tente novamente.');
        }
    };
    draw();
}
