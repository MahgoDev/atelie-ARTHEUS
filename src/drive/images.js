import { types } from './collection.js';
export async function validateFile(file) {
    if (!file || !types.includes(file.type) || file.size === 0 || file.size > 32 * 1024 * 1024)
        throw Error('Selecione uma imagem PNG, JPEG ou WebP de até 32 MB.');
    const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const ascii = (i, n) => String.fromCharCode(...b.slice(i, i + n));
    const match = file.type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v)
        : file.type === 'image/jpeg' ? b[0] === 255 && b[1] === 216 && b[2] === 255 : ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP';
    if (!match)
        throw Error('O conteúdo do arquivo não corresponde ao formato informado.');
}
export async function resizeImage(blob, maxSide) {
    const url = URL.createObjectURL(blob);
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw Error('Este navegador não conseguiu preparar a imagem.');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = await new Promise(resolve => canvas.toBlob(resolve, blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp', 0.86));
        if (!out)
            throw Error('Não foi possível otimizar a imagem. Tente enviar o original.');
        return scale === 1 && maxSide >= 2560 && out.size >= blob.size ? blob : out;
    }
    finally {
        URL.revokeObjectURL(url);
    }
}
// Download at most two previews at once. Discard bitmaps and URLs after they leave the viewport.
export function observeImages(root, works, collection, current) {
    let active = 0, closed = false;
    const watched = new Map();
    const observer = new IntersectionObserver(entries => {
        for (const e of entries) {
            const s = watched.get(e.target);
            if (!s)
                continue;
            s.visible = e.isIntersecting;
            if (!s.visible) {
                s.failed = false;
                release(e.target, s);
            }
        }
        pump();
    }, { rootMargin: '150px' });
    function release(el, s) { s.controller?.abort(); if (s.url) {
        el.removeAttribute('src');
        URL.revokeObjectURL(s.url);
        s.url = '';
    } }
    async function fetchOne(el, s) {
        active++;
        s.loading = true;
        const controller = new AbortController();
        s.controller = controller;
        const owner = collection.api.signal;
        const end = () => controller.abort();
        owner?.addEventListener('abort', end, { once: true });
        try {
            const blob = await collection.image(s.work, controller.signal);
            if (closed || !s.visible || !current())
                return;
            const thumb = await resizeImage(blob, 480);
            if (closed || !s.visible || !current())
                return;
            s.url = URL.createObjectURL(thumb);
            el.src = s.url;
        }
        catch {
            if (!closed && !controller.signal.aborted) {
                s.failed = true;
                el.alt = 'Prévia indisponível';
            }
        }
        finally {
            owner?.removeEventListener('abort', end);
            s.controller = null;
            s.loading = false;
            active--;
            pump();
        }
    }
    function pump() {
        if (closed)
            return;
        for (const [el, s] of watched) {
            if (active >= 2)
                break;
            if (s.visible && !s.url && !s.loading && !s.failed)
                void fetchOne(el, s);
        }
    }
    for (const el of root.querySelectorAll('[data-preview]')) {
        const work = works.find(w => w.id === el.dataset.preview);
        if (!work)
            continue;
        watched.set(el, { visible: false, url: '', work });
        observer.observe(el);
    }
    return () => { closed = true; observer.disconnect(); for (const [el, s] of watched)
        release(el, s); watched.clear(); };
}
