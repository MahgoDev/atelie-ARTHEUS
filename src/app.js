import { icon } from './icons.js';
import { db, pref, setPref } from './data.js';
import { toolsMenu, seeds } from './content.js';
import { esc, toast, copy, randomOther } from './ui.js';
import { renderReading } from './reading.js';
import { sheets } from './sheets.js';
import { reviews, filter } from './reflection.js';
import { ideas } from './ideas.js';
import { settings } from './backup.js';
const names = Object.fromEntries(toolsMenu.map(([k, name]) => [k, name]));
Object.assign(names, { portal: 'Portal', config: 'Configurações' });
const navgroups = [['Ateliê', ['portal', 'grimorio', 'magia']], ['Criação', ['ficha', 'ideias']], ['Desenvolvimento', ['avaliacao', 'filtro']]];
let route = 'portal', activeVersion = 0, suggestion = seeds[0];
const href = k => '#/' + k;
const brand = `<a class="brand" href="#/portal" aria-label="Ateliê ARTHEUS, portal">${icon('prism', 40)}<span><i>Ateliê</i><strong>ARTHEUS</strong></span></a>`;
const navLink = (k, label = names[k]) => `<a href="${href(k)}" ${route === k ? 'aria-current="page"' : ''}>${icon(k, 19)}<span>${esc(label)}</span></a>`;
const navGroups = () => navgroups.map(([label, keys]) => `<div class="nav-group"><p>${label}</p>${keys.map(k => navLink(k)).join('')}</div>`).join('');
function shell() {
    document.querySelector('#sidebar').innerHTML = brand + `<div class="brand-rule"><span>✧</span></div><nav aria-label="Navegação principal">${navGroups()}</nav><div class="side-end">${navLink('config')}<span class="version">Ateliê pessoal <b>·</b> v1.0</span></div>`;
    document.querySelector('#topbar').innerHTML = `<div class="crumb">${icon('prism', 17)}<span>Ateliê</span><b>/</b><strong>${names[route]}</strong></div><button class="theme-button" id="theme-toggle"></button>`;
    document.querySelector('#theme-toggle').onclick = () => { theme(document.documentElement.dataset.theme === 'night' ? 'paper' : 'night'); const sel = document.querySelector('#theme-choice'); if (sel)
        sel.value = document.documentElement.dataset.theme; };
    drawTheme();
    document.querySelector('#mobile-nav').innerHTML = navLink('portal') + navLink('ficha', 'Fichas') + navLink('ideias', 'Ideias') + `<button id="more" aria-haspopup="dialog">${icon('menu', 19)}Menu</button>`;
    const dlg = document.querySelector('#nav-dialog');
    dlg.innerHTML = `<div class="section-title"><h2>Menu do Ateliê</h2><button class="icon-btn" aria-label="Fechar menu">${icon('close')}</button></div><nav>${navGroups()}<div class="nav-group">${navLink('config')}</div></nav>`;
    document.querySelector('#more').onclick = () => dlg.showModal();
    dlg.onclick = e => { if (e.target === dlg || e.target.closest('button,a'))
        dlg.close(); };
}
function drawTheme() {
    const paper = document.documentElement.dataset.theme === 'paper';
    document.querySelector('meta[name=theme-color]').content = paper ? '#f4ece4' : '#17141e';
    const el = document.querySelector('#theme-toggle');
    if (el) {
        el.innerHTML = icon(paper ? 'sun' : 'moon', 16) + '<span>Grimório ' + (paper ? 'de Papel' : 'Noturno') + '</span>';
        el.setAttribute('aria-label', 'Alternar para o Grimório ' + (paper ? 'Noturno' : 'de Papel'));
    }
}
function theme(value) { document.documentElement.dataset.theme = value === 'paper' ? 'paper' : 'night'; setPref('theme', document.documentElement.dataset.theme); drawTheme(); }
document.documentElement.dataset.theme = pref('theme', 'night') === 'paper' ? 'paper' : 'night';
async function portal(root) {
    const cards = toolsMenu.map(([k, name, group, desc]) => `<a class="tool-card card-${k}" href="#/${k}"><div class="card-head"><span class="tile-icon">${icon(k, 26)}</span><span class="tile-arrow">${icon('arrow', 16)}</span></div><h3>${name}</h3><p>${desc}</p></a>`).join('');
    root.innerHTML = `<section class="hero"><div class="hero-inner"><div class="hero-kicker"><i></i> Grimório contemporâneo</div><h1>Ateliê <em>ARTHEUS</em></h1><p>Universos extraordinários.<br>Sentimentos reais.</p><a class="hero-cta" href="#/ficha/nova">${icon('pen', 17)} Criar uma ficha ${icon('arrow', 16)}</a></div><span class="corner a"></span><span class="corner b"></span></section>
 <section class="tools-section"><div class="section-label"><span class="eyebrow">Ferramentas do ateliê</span><i></i>${icon('spark', 15)}</div><h2>O que deseja criar hoje?</h2><div class="cards">${cards}</div></section>
 <div id="resume"></div><section class="portal-notes"><article class="inspiration"><div class="section-label">${icon('spark', 16)}<span class="eyebrow">Uma ideia para hoje</span></div><h3 id="idea-title"></h3><p id="idea-body"></p><div class="actions"><button class="btn" id="reroll">${icon('dice', 16)} Outra ideia</button><a class="textlink" href="#/ideias">Abrir o banco ${icon('arrow', 14)}</a></div></article><article class="freedom"><div class="section-label">${icon('magia', 17)}<span class="eyebrow">Liberdade criativa</span></div><blockquote>“Meu desejo vem antes das métricas.”</blockquote><a class="textlink" href="#/grimorio">Meu Grimório ${icon('arrow', 15)}</a></article></section>`;
    const drawIdea = () => { root.querySelector('#idea-title').textContent = suggestion.title; root.querySelector('#idea-body').textContent = suggestion.idea; };
    drawIdea();
    root.querySelector('#reroll').onclick = () => { suggestion = randomOther(seeds, suggestion.id); drawIdea(); };
    const items = await db.list('sheet');
    if (items[0])
        root.querySelector('#resume').innerHTML = `<a class="resume" href="#/ficha/${encodeURIComponent(items[0].id)}">${icon('pen', 18)} Retomar minha última ficha <strong>${esc(items[0].title)}</strong>${icon('arrow', 16)}</a>`;
}
async function render() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [key, rawId] = hash.split('/');
    let id;
    try {
        id = decodeURIComponent(rawId || '');
    }
    catch {
        id = '';
    }
    route = Object.hasOwn(names, key) ? key : 'portal';
    const version = ++activeVersion;
    shell();
    document.title = names[route] + ' · Ateliê ARTHEUS';
    const main = document.querySelector('main');
    const view = document.createElement('div');
    view.className = 'page';
    main.replaceChildren(view);
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
    try {
        switch (route) {
            case 'portal':
                await portal(view);
                break;
            case 'grimorio':
            case 'magia':
                await renderReading(view, route, { db, pref, setPref, esc, toast, copy });
                break;
            case 'ficha':
                await sheets(view, id);
                break;
            case 'avaliacao':
                await reviews(view, id);
                break;
            case 'filtro':
                await filter(view);
                break;
            case 'ideias':
                await ideas(view);
                break;
            case 'config':
                settings(view, theme);
                break;
        }
    }
    catch (error) {
        if (version === activeVersion) {
            const p = document.createElement('p');
            p.className = 'panel';
            p.setAttribute('role', 'alert');
            p.textContent = 'Não foi possível acessar os registros locais. Confira as permissões de armazenamento do navegador e recarregue a página.';
            view.append(p);
        }
        console.error(error);
    }
}
document.querySelector('.skip').onclick = e => { e.preventDefault(); document.querySelector('main').focus(); };
window.addEventListener('preference-error', () => toast('O navegador não conseguiu guardar esta preferência.'));
window.addEventListener('unhandledrejection', () => toast('A operação não foi concluída. Confira o armazenamento do navegador e tente novamente.'));
window.addEventListener('hashchange', render);
render();
if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('./sw.js').catch(() => toast('O modo offline ainda não está disponível neste navegador.'));
