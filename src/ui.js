import { icon } from './icons.js';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function toast(message) {
    const el = document.querySelector('#notice');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.hidden = true; }, 4600);
}
export async function copy(value) {
    try {
        await navigator.clipboard.writeText(value);
        toast('Texto copiado.');
    }
    catch {
        toast('A cópia não foi permitida pelo navegador. Selecione o texto para copiar.');
    }
}
export function download(name, data, type) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function heading(section, title, description) {
    return `<header class="page-head"><span class="eyebrow">${esc(section)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></header>`;
}
export const btn = (name, label, action, primary = false) => `<button type="button" class="btn ${primary ? 'primary' : ''}" data-action="${action}">${icon(name, 17)}${esc(label)}</button>`;
export function options(values, current, placeholder = 'Escolher') {
    return '<option value="">' + esc(placeholder) + '</option>' + values.map(v => `<option ${v === current ? 'selected' : ''} value="${esc(v)}">${esc(v)}</option>`).join('');
}
export function history(records, route, empty) {
    return records.length ? `<div class="record-list">${records.map(row => `<a href="#/${route}/${encodeURIComponent(row.id)}"><span>${esc(row.title)}</span><small>${esc(new Date(row.updatedAt).toLocaleDateString('pt-BR'))}</small>${icon('arrow', 16)}</a>`).join('')}</div>` : `<p class="empty">${empty}</p>`;
}
export function randomOther(items, previous) {
    const pool = items.length > 1 ? items.filter(item => item.id !== previous) : items;
    return pool[Math.floor(Math.random() * pool.length)];
}
