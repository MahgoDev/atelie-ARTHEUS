const api = 'https://www.googleapis.com/drive/v3/files';
const uploadApi = 'https://www.googleapis.com/upload/drive/v3/files';
export const fields = 'id,name,description,mimeType,parents,appProperties,version,createdTime,modifiedTime,trashed,ownedByMe,shared,size';
export const conflict = 'Este item mudou em outro dispositivo. Feche o editor, atualize o acervo e confira a versão mais recente.';
const escapeQuery = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
export const quoted = value => "'" + escapeQuery(value) + "'";
async function checked(response) {
    if (response.ok)
        return response;
    if ([409, 412].includes(response.status))
        throw Error(conflict);
    if (response.status === 404)
        throw Error('O item foi removido ou deixou de estar acessível. Atualize o acervo.');
    if (response.status === 403 || response.status === 429)
        throw Error('O Drive recusou a operação. Confira as permissões, o espaço disponível e a cota do Google.');
    throw Error('O Drive não concluiu a operação (HTTP ' + response.status + '). Atualize o acervo antes de repetir.');
}
export class DriveApi {
    constructor(session) {
        const owner = session.signal;
        this.signal = owner;
        this.send = (url, options) => session.request(url, options, owner);
    }
    async json(method, path = '', params = {}, body, extraHeaders = {}) {
        const url = new URL(api + path);
        url.search = new URLSearchParams(params);
        const headers = { ...extraHeaders };
        if (body !== undefined)
            headers['Content-Type'] = 'application/json';
        const res = await checked(await this.send(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
        const data = await res.json();
        const etag = res.headers.get('etag');
        if (etag)
            data.etag = etag;
        return data;
    }
    async list(query) {
        const result = [];
        let pageToken;
        do {
            const params = { q: 'trashed = false and ' + query, spaces: 'drive', fields: 'nextPageToken,incompleteSearch,files(' + fields + ')', pageSize: '100' };
            if (pageToken)
                params.pageToken = pageToken;
            const page = await this.json('GET', '', params);
            if (page.incompleteSearch)
                throw Error('O Drive retornou uma lista incompleta. Atualize antes de continuar.');
            result.push(...(page.files || []));
            pageToken = page.nextPageToken;
        } while (pageToken);
        return result;
    }
    get(id) { return this.json('GET', '/' + encodeURIComponent(id), { fields }); }
    create(metadata) { return this.json('POST', '', { fields }, metadata); }
    update(item, metadata, params = {}) {
        return this.json('PATCH', '/' + encodeURIComponent(item.id), { fields, ...params }, metadata, item.etag ? { 'If-Match': item.etag } : {});
    }
    async media(id, signal) {
        const url = api + '/' + encodeURIComponent(id) + '?alt=media';
        return (await checked(await this.send(url, { signal }))).blob();
    }
    async upload(metadata, blob, onProgress) {
        // A preallocated Drive ID makes a committed upload identifiable even after an interrupted response.
        const { ids } = await this.json('GET', '/generateIds', { count: '1', space: 'drive' });
        const id = ids[0];
        const start = await checked(await this.send(uploadApi + '?uploadType=resumable&fields=' + encodeURIComponent(fields), {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Upload-Content-Type': blob.type, 'X-Upload-Content-Length': String(blob.size) },
            body: JSON.stringify({ ...metadata, id })
        }));
        const url = start.headers.get('Location');
        if (!url)
            throw Error('O Drive não forneceu a sessão de envio.');
        const chunk = 4 * 1024 * 1024;
        let offset = 0;
        try {
            while (offset < blob.size) {
                const end = Math.min(offset + chunk, blob.size);
                const res = await this.send(url, { method: 'PUT', headers: { 'Content-Type': blob.type, 'Content-Range': 'bytes ' + offset + '-' + (end - 1) + '/' + blob.size }, body: blob.slice(offset, end, blob.type) });
                if (res.status === 308) {
                    const range = /^bytes=0-(\d+)$/.exec(res.headers.get('Range') || '');
                    const next = range ? Number(range[1]) + 1 : 0;
                    if (next <= offset || next > end)
                        throw Error('O Drive não confirmou o trecho enviado.');
                    offset = next;
                    onProgress?.(offset / blob.size);
                }
                else {
                    await checked(res);
                    const file = await res.json();
                    onProgress?.(1);
                    return file;
                }
            }
            throw Error('O Drive não confirmou o envio.');
        }
        catch (err) {
            try {
                const saved = await this.get(id);
                if (saved.id === id && !saved.trashed) {
                    onProgress?.(1);
                    return saved;
                }
            }
            catch { }
            throw err;
        }
    }
}
