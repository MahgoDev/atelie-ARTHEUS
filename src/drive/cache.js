/* Cache descartável de miniaturas. Nunca contém tokens ou originais. */
const DB = 'artheus-acervo-thumbnails-v1';
const STORE = 'thumbnails';
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_ITEMS = 1500;
const MAX_THUMB = 2 * 1024 * 1024;
const TTL = 7 * 24 * 60 * 60 * 1000;
const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);
const sessions = new WeakMap();
let opening;

function openDB() {
    if (!globalThis.indexedDB) return Promise.reject(Error('IndexedDB indisponível'));
    if (!opening) {
        opening = new Promise((resolve, reject) => {
            const r = indexedDB.open(DB, 1);
            r.onupgradeneeded = () => {
                const store = r.result.createObjectStore(STORE, { keyPath: 'key' });
                store.createIndex('account', 'account');
            };
            r.onerror = () => reject(r.error);
            r.onblocked = () => reject(Error('Cache indisponível'));
            r.onsuccess = () => {
                const db = r.result;
                db.onversionchange = () => { db.close(); opening = undefined; };
                resolve(db);
            };
        }).catch(err => { opening = undefined; throw err; });
    }
    return opening;
}

function transaction(db, mode, run) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        let result;
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(tx.error || Error('Cache interrompido'));
        try { run(tx.objectStore(STORE), value => { result = value; }); }
        catch (err) { tx.abort(); reject(err); }
    });
}

function validBlob(blob) {
    return blob instanceof Blob && blob.size > 0 && blob.size <= MAX_THUMB && allowed.has(blob.type);
}

async function purge(account) {
    try {
        const db = await openDB();
        await transaction(db, 'readwrite', store => {
            const r = store.index('account').openKeyCursor(IDBKeyRange.only(account));
            r.onsuccess = () => {
                const c = r.result;
                if (!c) return;
                store.delete(c.primaryKey);
                c.continue();
            };
        });
    } catch { /* Falhas locais não impedem a desconexão. */ }
}

// O ID é obtido do Google com o token ativo, nunca de um campo informado pelo artista.
async function identify(api) {
    const owner = api.signal;
    if (!owner || owner.aborted || !globalThis.indexedDB) return null;
    let state = sessions.get(owner);
    if (!state) {
        state = { account: null };
        sessions.set(owner, state);
        owner.addEventListener('abort', () => {
            if (state.account) void purge(state.account);
            sessions.delete(owner);
        }, { once: true });
        state.pending = (async () => {
            const url = new URL('https://www.googleapis.com/drive/v3/about');
            url.searchParams.set('fields', 'user(permissionId)');
            const res = await api.send(url, { method: 'GET' });
            if (!res.ok) return null;
            const account = (await res.json()).user?.permissionId;
            if (owner.aborted || typeof account !== 'string' || !account) return null;
            state.account = account;
            return account;
        })().catch(() => null);
    }
    return state.pending;
}

function keyFor(account, work) {
    const version = work?.version || work?.modifiedTime;
    return account && work?.id && version ? [account, String(work.id), String(version)] : null;
}

export async function readThumbnail(api, work) {
    try {
        const account = await identify(api);
        const key = keyFor(account, work);
        if (!key || api.signal.aborted) return null;
        const db = await openDB();
        if (api.signal.aborted) return null;
        const blob = await transaction(db, 'readwrite', (store, done) => {
            const r = store.get(key);
            r.onsuccess = () => {
                const row = r.result;
                if (!row) return;
                if (!validBlob(row.blob) || Date.now() - row.saved > TTL) {
                    store.delete(key);
                    return;
                }
                row.used = Date.now();
                store.put(row);
                done(row.blob);
            };
        });
        return api.signal.aborted ? null : blob || null;
    } catch { return null; }
}

export async function writeThumbnail(api, work, blob) {
    if (!validBlob(blob)) return false;
    try {
        const account = await identify(api);
        const key = keyFor(account, work);
        if (!key || api.signal.aborted) return false;
        const db = await openDB();
        if (api.signal.aborted) return false;
        const now = Date.now();
        await transaction(db, 'readwrite', store => {
            // Um único transaction mantém o orçamento consistente entre escritas simultâneas.
            // O cursor lê apenas o tamanho de cada blob, sem decodificar imagens.
            const entries = [];
            const r = store.openCursor();
            r.onsuccess = () => {
                const c = r.result;
                if (c) {
                    const row = c.value;
                    if (Date.now() - row.saved > TTL ||
                        (row.account === account && row.key[1] === key[1])) {
                        c.delete();
                    } else {
                        entries.push({ key: c.primaryKey, bytes: row.blob?.size || 0, used: row.used || 0 });
                    }
                    c.continue();
                    return;
                }
                entries.sort((a, b) => a.used - b.used);
                let bytes = entries.reduce((n, e) => n + e.bytes, blob.size);
                let count = entries.length + 1;
                for (const e of entries) {
                    if (bytes <= MAX_BYTES && count <= MAX_ITEMS) break;
                    store.delete(e.key);
                    bytes -= e.bytes;
                    count--;
                }
                store.put({ key, account, blob, saved: now, used: now });
            };
        });
        return !api.signal.aborted;
    } catch { return false; }
}
