import { DRIVE_SCOPE, validClientId } from './config.js';
let loading;
export function loadIdentity() {
    if (globalThis.google?.accounts?.oauth2)
        return Promise.resolve();
    if (loading)
        return loading;
    loading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const fail = () => {
            clearTimeout(timer);
            script.remove();
            loading = undefined;
            reject(new Error('Não foi possível carregar a autorização do Google. Confira sua conexão e tente novamente.'));
        };
        const timer = setTimeout(fail, 15000);
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => { clearTimeout(timer); globalThis.google?.accounts?.oauth2 ? resolve() : fail(); };
        script.onerror = fail;
        document.head.append(script);
    });
    return loading;
}
export class DriveSession extends EventTarget {
    #token = '';
    #until = 0;
    #timer;
    #attempt = 0;
    #controller = new AbortController();
    message = '';
    get connected() { return !!this.#token && Date.now() < this.#until; }
    get signal() { return this.#controller.signal; }
    clear(message = '', revoke = false) {
        const old = this.#token;
        ++this.#attempt;
        clearTimeout(this.#timer);
        this.#token = '';
        this.#until = 0;
        this.message = message;
        this.#controller.abort();
        this.#controller = new AbortController();
        this.dispatchEvent(new Event('change'));
        if (revoke && old) {
            try {
                globalThis.google?.accounts?.oauth2?.revoke(old, () => { });
            }
            catch { }
        }
    }
    authorize(id, oauth = globalThis.google?.accounts?.oauth2) {
        if (!validClientId(id) || !oauth)
            throw Error('Confira o Client ID e carregue a autorização do Google.');
        if (globalThis.navigator?.onLine === false)
            throw Error('Conecte o dispositivo à internet para abrir o acervo.');
        this.clear('Aguardando autorização no Google…');
        const attempt = this.#attempt;
        const fail = message => { if (attempt === this.#attempt)
            this.clear(message); };
        const client = oauth.initTokenClient({
            client_id: id, scope: DRIVE_SCOPE, include_granted_scopes: false,
            callback: result => {
                if (attempt !== this.#attempt)
                    return;
                if (result.error || !result.access_token || !result.scope?.split(/\s+/).includes(DRIVE_SCOPE))
                    return fail('A autorização do Drive não foi concedida. Você pode tentar novamente.');
                const lifetime = Number(result.expires_in) * 1000;
                if (!Number.isFinite(lifetime) || lifetime <= 0)
                    return fail('A autorização expirou. Reconecte ao Google.');
                this.#token = result.access_token;
                this.#until = Date.now() + lifetime;
                this.#timer = setTimeout(() => this.clear('A autorização expirou. Reconecte ao Google.'), lifetime);
                this.message = '';
                this.dispatchEvent(new Event('change'));
            },
            error_callback: e => fail(e.type === 'popup_failed_to_open' ? 'O navegador bloqueou a janela. Permita pop-ups para este site e tente novamente.' : 'A janela de autorização foi fechada. Você pode conectar novamente.')
        });
        try {
            client.requestAccessToken({ prompt: 'select_account' });
        }
        catch {
            fail('Não foi possível abrir o Google. Tente novamente pelo navegador.');
        }
    }
    async request(url, options = {}, owner = this.signal) {
        if (owner.aborted || owner !== this.signal)
            throw new DOMException('Sessão encerrada', 'AbortError');
        if (!this.connected) {
            this.clear('Autorização expirada. Reconecte ao Google.');
            throw Error(this.message);
        }
        const target = new URL(url);
        if (target.origin !== 'https://www.googleapis.com' || !/^\/(upload\/)?drive\/v3\//.test(target.pathname))
            throw Error('Destino de requisição inválido.');
        const headers = new Headers(options.headers);
        headers.set('Authorization', 'Bearer ' + this.#token);
        const signal = options.signal || owner;
        const response = await fetch(target, { ...options, headers, signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
        owner.throwIfAborted();
        if (response.status === 401) {
            this.clear('Sua autorização expirou. Reconecte ao Google Drive.');
            throw Error(this.message);
        }
        return response;
    }
}
export const session = new DriveSession();
