export const kinds = ['sheet', 'review', 'idea', 'favorite', 'reflection'];
export const schemaVersion = 1;
const databaseName = 'atelie-artheus-v1';
let opening;
function connect() {
    if (!opening)
        opening = new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName, 1);
            request.onupgradeneeded = () => {
                for (const kind of kinds)
                    request.result.createObjectStore(kind, { keyPath: 'id' });
            };
            request.onsuccess = () => {
                request.result.onversionchange = () => { request.result.close(); opening = undefined; };
                resolve(request.result);
            };
            request.onerror = () => { opening = undefined; reject(request.error); };
        });
    return opening;
}
async function transact(stores, mode, callback) {
    const connection = await connect();
    return new Promise((resolve, reject) => {
        const tx = connection.transaction(stores, mode);
        let result;
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(tx.error || new Error('A operação foi interrompida.'));
        try {
            callback(tx, value => { result = value; });
        }
        catch (error) {
            tx.abort();
            reject(error);
        }
    });
}
export const db = {
    async list(kind) {
        return transact(kind, 'readonly', (tx, done) => {
            const req = tx.objectStore(kind).getAll();
            req.onsuccess = () => done(req.result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        });
    },
    async save(kind, data) {
        const now = new Date().toISOString();
        const id = data.id || crypto.randomUUID();
        return transact(kind, 'readwrite', (tx, done) => {
            const store = tx.objectStore(kind);
            const read = store.get(id);
            read.onsuccess = () => {
                const row = { ...data, id, createdAt: read.result?.createdAt || now, updatedAt: now, schemaVersion };
                store.put(row);
                done(row);
            };
        });
    },
    async remove(kind, id) {
        const stores = kind === 'sheet' ? ['sheet', 'reflection'] : kind === 'idea' ? ['idea', 'favorite'] : kind;
        return transact(stores, 'readwrite', tx => {
            tx.objectStore(kind).delete(id);
            if (kind === 'idea')
                tx.objectStore('favorite').delete('idea-' + id);
            if (kind === 'sheet') {
                const cursor = tx.objectStore('reflection').openCursor();
                cursor.onsuccess = () => {
                    const item = cursor.result;
                    if (!item)
                        return;
                    if (item.value.sheetId === id)
                        item.update({ ...item.value, sheetId: '', updatedAt: new Date().toISOString() });
                    item.continue();
                };
            }
        });
    },
    async dump() {
        return transact(kinds, 'readonly', (tx, done) => {
            const records = {};
            for (const kind of kinds) {
                const req = tx.objectStore(kind).getAll();
                req.onsuccess = () => { records[kind] = req.result; };
            }
            done(records);
        });
    },
    async restore(records) {
        return transact(kinds, 'readwrite', tx => {
            for (const kind of kinds) {
                const store = tx.objectStore(kind);
                store.clear();
                for (const row of records[kind])
                    store.put(row);
            }
        });
    }
};
const prefix = 'artheus:';
export function pref(key, fallback) {
    try {
        const value = localStorage.getItem(prefix + key);
        return value === null ? fallback : JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
export function setPref(key, value) {
    try {
        localStorage.setItem(prefix + key, JSON.stringify(value));
    }
    catch {
        window.dispatchEvent(new Event('preference-error'));
    }
}
export function preferences() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix))
            out[k.slice(prefix.length)] = pref(k.slice(prefix.length), null);
    }
    return out;
}
export function restorePreferences(data) {
    for (const [key, value] of Object.entries(data))
        localStorage.setItem(prefix + key, JSON.stringify(value));
    for (const k of Object.keys(preferences()))
        if (!Object.hasOwn(data, k))
            localStorage.removeItem(prefix + k);
}
