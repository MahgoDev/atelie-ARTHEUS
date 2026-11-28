
import { types } from './collection.js';
import { readThumbnail, writeThumbnail } from './cache.js';


/* ========================================
   CONFIGURAÇÕES DE DESEMPENHO
   ======================================== */

const MAX_CACHE_ITEMS = 60;
const MAX_CACHE_BYTES = 20 * 1024 * 1024;
const MAX_CONCURRENT = 4;
const THUMB_SIZE = 480;

/*
 * Cada sessão autorizada possui seu próprio cache.
 * As imagens permanecem somente na memória.
 */

const sessionCaches = new WeakMap();


/* ========================================
   CACHE DE MINIATURAS
   ======================================== */

function getCache(owner) {

    if (!owner || owner.aborted) {
        return null;
    }

    let cache = sessionCaches.get(owner);

    if (!cache) {

        cache = {
            items: new Map(),
            bytes: 0
        };

        sessionCaches.set(owner, cache);

        owner.addEventListener('abort', () => {
            cache.items.clear();
            cache.bytes = 0;
            sessionCaches.delete(owner);
        }, { once: true });
    }

    return cache;
}


function cacheKey(work) {

    const version =
        work.version || work.modifiedTime;

    if (!version) {
        return null;
    }

    return `${work.id}:${version}`;
}


function getCached(cache, key) {

    if (!cache || !key) {
        return null;
    }

    const item = cache.items.get(key);

    if (!item) {
        return null;
    }

    /*
     * Atualiza a ordem de utilização.
     * As miniaturas mais recentes ficam no final.
     */

    cache.items.delete(key);
    cache.items.set(key, item);

    return item;
}


function saveCached(cache, key, blob) {

    if (
        !cache ||
        !key ||
        blob.size > MAX_CACHE_BYTES
    ) {
        return;
    }

    const previous = cache.items.get(key);

    if (previous) {
        cache.bytes -= previous.size;
        cache.items.delete(key);
    }

    cache.items.set(key, blob);
    cache.bytes += blob.size;

    /*
     * Remove as miniaturas menos recentemente
     * utilizadas quando atingir os limites.
     */

    while (
        cache.items.size > MAX_CACHE_ITEMS ||
        cache.bytes > MAX_CACHE_BYTES
    ) {

        const oldestKey =
            cache.items.keys().next().value;

        const oldest =
            cache.items.get(oldestKey);

        cache.bytes -= oldest.size;
        cache.items.delete(oldestKey);
    }
}


/* ========================================
   VALIDAÇÃO DE ARQUIVOS
   ======================================== */

export async function validateFile(file) {

    if (
        !file ||
        !types.includes(file.type) ||
        file.size === 0 ||
        file.size > 32 * 1024 * 1024
    ) {
        throw Error(
            'Selecione uma imagem PNG, JPEG ou WebP de até 32 MB.'
        );
    }

    const b = new Uint8Array(
        await file.slice(0, 12).arrayBuffer()
    );

    const ascii = (i, n) =>
        String.fromCharCode(
            ...b.slice(i, i + n)
        );

    const match =
        file.type === 'image/png'

            ? [137, 80, 78, 71, 13, 10, 26, 10]
                .every((v, i) => b[i] === v)

            : file.type === 'image/jpeg'

                ? b[0] === 255 &&
                  b[1] === 216 &&
                  b[2] === 255

                : ascii(0, 4) === 'RIFF' &&
                  ascii(8, 4) === 'WEBP';

    if (!match) {
        throw Error(
            'O conteúdo do arquivo não corresponde ao formato informado.'
        );
    }
}


/* ========================================
   REDIMENSIONAMENTO DE IMAGENS
   ======================================== */

export async function resizeImage(blob, maxSide, thumbnail = false) {

    const url = URL.createObjectURL(blob);

    try {

        const img = new Image();

        img.src = url;

        await img.decode();

        const scale = Math.min(
            1,
            maxSide / Math.max(
                img.naturalWidth,
                img.naturalHeight
            )
        );

        const canvas =
            document.createElement('canvas');

        canvas.width = Math.max(
            1,
            Math.round(img.naturalWidth * scale)
        );

        canvas.height = Math.max(
            1,
            Math.round(img.naturalHeight * scale)
        );

        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw Error(
                'Este navegador não conseguiu preparar a imagem.'
            );
        }

        ctx.drawImage(
            img,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const out = await new Promise(resolve =>
            canvas.toBlob(
                resolve,

                !thumbnail && blob.type === 'image/jpeg'
                    ? 'image/jpeg'
                    : 'image/webp',

                0.86
            )
        );

        if (!out) {
            throw Error(
                'Não foi possível otimizar a imagem. Tente enviar o original.'
            );
        }

        return scale === 1 &&
               maxSide >= 2560 &&
               out.size >= blob.size

            ? blob
            : out;

    } finally {

        URL.revokeObjectURL(url);

    }
}


// Originais privados: cache por sessão, limitado a 64 MiB e 8 arquivos.
const originalCaches = new WeakMap();
const ORIGINAL_LIMIT = 64 * 1024 * 1024;
export async function loadOriginal(collection, work) {
    const owner = collection.api.signal;
    owner.throwIfAborted();
    const key = cacheKey(work);
    if (!key) return collection.image(work, owner);
    let cache = originalCaches.get(owner);
    if (!cache) {
        cache = { items: new Map(), jobs: new Map(), bytes: 0 };
        originalCaches.set(owner, cache);
        owner.addEventListener('abort', () => {
            cache.items.clear(); cache.jobs.clear(); cache.bytes = 0;
            originalCaches.delete(owner);
        }, { once: true });
    }
    if (cache.jobs.has(key)) return cache.jobs.get(key);
    const job = (async () => {
        // Mesmo em cache, confirme propriedade, privacidade e versão.
        const cached = cache.items.get(key);
        if (cached) {
            await collection.artwork(work, work.version);
            owner.throwIfAborted();
            if (cache.items.has(key)) {
                cache.items.delete(key); cache.items.set(key, cached);
            }
            return cached;
        }
        const blob = await collection.image(work, owner);
        owner.throwIfAborted();
        if (blob.size <= ORIGINAL_LIMIT) {
            cache.items.set(key, blob); cache.bytes += blob.size;
            while (cache.bytes > ORIGINAL_LIMIT || cache.items.size > 8) {
                const oldest = cache.items.keys().next().value;
                cache.bytes -= cache.items.get(oldest).size;
                cache.items.delete(oldest);
            }
        }
        return blob;
    })();
    cache.jobs.set(key, job);
    try { return await job; }
    finally { if (cache.jobs.get(key) === job) cache.jobs.delete(key); }
}

// Uma tarefa por obra/versão e sessão, inclusive entre galerias.
const thumbnailJobs = new WeakMap();
const remoteReady = new WeakMap();
function sessionMap(container, owner) {
    let map = container.get(owner);
    if (!map) { map = new Map(); container.set(owner, map); }
    return map;
}

export async function prepareThumbnail(collection, work, original) {
    const owner = collection.api.signal;
    owner.throwIfAborted();
    const key = cacheKey(work);
    const jobs = sessionMap(thumbnailJobs, owner);
    if (jobs.has(key)) return jobs.get(key);
    const ready = sessionMap(remoteReady, owner);
    const job = (async () => {
        const cache = getCache(owner);
        await collection.artwork(work, work.version);
        let thumb = getCached(cache, key) || await readThumbnail(collection.api, work);
        if (!thumb && original) thumb = await resizeImage(original, THUMB_SIZE, true);
        if (!thumb) {
            try {
                thumb = await collection.readRemoteThumbnail(work);
                if (thumb) { await validateFile(thumb); ready.set(key, true); }
            } catch { thumb = null; }
        }
        owner.throwIfAborted();
        if (!thumb) thumb = await resizeImage(await loadOriginal(collection, work), THUMB_SIZE, true);
        owner.throwIfAborted();
        saveCached(cache, key, thumb);
        void writeThumbnail(collection.api, work, thumb);
        return thumb;
    })();
    jobs.set(key, job);
    try { return await job; } finally { if (jobs.get(key) === job) jobs.delete(key); }
}

const remoteJobs = new WeakMap();
export async function persistRemoteThumbnail(collection, work, thumb) {
    const owner = collection.api.signal;
    if (owner.aborted) return false;
    const key = cacheKey(work);
    const ready = sessionMap(remoteReady, owner);
    if (ready.has(key)) return true;
    const jobs = sessionMap(remoteJobs, owner);
    if (jobs.has(key)) return jobs.get(key);
    const job = (async () => {
        try {
            const ok = await collection.saveRemoteThumbnail(work, thumb);
            if (ok) ready.set(key, true);
            return ok;
        } catch { return false; }
    })();
    jobs.set(key, job);
    try { return await job; } finally { if (jobs.get(key) === job) jobs.delete(key); }
}

/* ========================================
   CARREGAMENTO INTELIGENTE DAS MINIATURAS
   ======================================== */

export function observeImages(
    root,
    works,
    collection,
    current
) {

    let active = 0;
    let closed = false;

    const watched = new Map();

    const owner = collection.api.signal;

    const cache = getCache(owner);

    const workMap = new Map(
        works.map(work => [work.id, work])
    );


    /* Verifica se a visualização continua válida */

    function isCurrent() {

        return !closed &&
               !owner?.aborted &&
               current();
    }


    /* Libera a URL exibida, mas mantém a miniatura */

    function release(el, s) {

        s.controller?.abort();

        if (s.url) {

            el.removeAttribute('src');

            URL.revokeObjectURL(s.url);

            s.url = '';
        }
    }


    /* Exibe uma miniatura */

    function show(el, s, blob) {

        if (!isCurrent() || !s.visible) {
            return;
        }

        if (s.url) {
            URL.revokeObjectURL(s.url);
        }

        s.url = URL.createObjectURL(blob);

        el.src = s.url;

        el.alt = s.originalAlt;

        s.failed = false;
    }


    /* Recupera uma miniatura do cache ou do Drive */

    async function fetchOne(el, s) {

        if (!isCurrent()) {
            return;
        }

        const key = cacheKey(s.work);

        /*
         * Primeiro tenta reutilizar uma miniatura
         * já carregada anteriormente.
         */

        const cached = getCached(cache, key);

        if (cached) {

            show(el, s, cached);

            return;
        }

        active++;

        s.loading = true;

        const controller = new AbortController();

        s.controller = controller;

        const end = () => controller.abort();

        owner?.addEventListener(
            'abort',
            end,
            { once: true }
        );

        try {

            owner?.throwIfAborted();

            /*
             * Baixa a imagem somente quando ela
             * ainda não estiver disponível no cache.
             */

            const thumb = await prepareThumbnail(collection, s.work);
            if (isCurrent() && s.visible && !controller.signal.aborted) show(el, s, thumb);
            // Não bloqueia a exibição. Mantém a fila limitada durante a migração.
            await persistRemoteThumbnail(collection, s.work, thumb);

        } catch {

            if (
                isCurrent() &&
                !controller.signal.aborted
            ) {

                s.failed = true;

                el.alt = 'Prévia indisponível';
            }

        } finally {

            owner?.removeEventListener(
                'abort',
                end
            );

            s.controller = null;

            s.loading = false;

            active--;

            pump();
        }
    }


    /* Organiza a fila de carregamento */

    function pump() {

        if (!isCurrent()) {
            return;
        }

        for (const [el, s] of watched) {

            if (
                !s.visible ||
                s.url ||
                s.loading ||
                s.failed
            ) {
                continue;
            }

            /*
             * Imagens em cache são exibidas
             * imediatamente, sem ocupar a fila.
             */

            const cached = getCached(
                cache,
                cacheKey(s.work)
            );

            if (cached) {

                show(el, s, cached);

                continue;
            }

            if (active >= MAX_CONCURRENT) {
                continue;
            }

            void fetchOne(el, s);
        }
    }


    /* Detecta imagens próximas da área visível */

    const observer = new IntersectionObserver(

        entries => {

            if (!isCurrent()) {
                return;
            }

            for (const e of entries) {

                const s = watched.get(e.target);

                if (!s) {
                    continue;
                }

                s.visible = e.isIntersecting;

                if (!s.visible) {

                    s.failed = false;

                    release(e.target, s);
                }
            }

            pump();
        },

        {
            rootMargin: '300px'
        }
    );


    /* Registra as imagens da página */

    for (
        const el of root.querySelectorAll(
            '[data-preview]'
        )
    ) {

        const work = workMap.get(
            el.dataset.preview
        );

        if (!work) {
            continue;
        }

        watched.set(el, {

            visible: false,

            url: '',

            work,

            loading: false,

            failed: false,

            controller: null,

            originalAlt: el.alt || ''
        });

        observer.observe(el);
    }


    /* Limpeza ao sair da visualização */

    function cleanup() {

        if (closed) {
            return;
        }

        closed = true;

        observer.disconnect();

        owner?.removeEventListener(
            'abort',
            cleanup
        );

        for (const [el, s] of watched) {
            release(el, s);
        }

        watched.clear();

        /*
         * O cache continua disponível durante
         * a mesma sessão Google.
         *
         * Ele será eliminado ao desconectar,
         * trocar de conta ou expirar a autorização.
         */
    }

    owner?.addEventListener(
        'abort',
        cleanup,
        { once: true }
    );

    if (owner?.aborted) {
        cleanup();
    }

    return cleanup;
}
