import { cp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validClientId } from '../src/drive/config.js';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function build() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
    if (clientId && !validClientId(clientId)) throw Error('GOOGLE_OAUTH_CLIENT_ID deve conter o identificador público do cliente Web.');
    const dist = path.join(root, 'dist');
    await rm(dist, { recursive: true, force: true });
    await mkdir(dist, { recursive: true });
    await cp(path.join(root, 'public'), dist, { recursive: true });
    await cp(path.join(root, 'src'), path.join(dist, 'src'), { recursive: true });
    if (clientId) {
        const configPath = path.join(dist, 'src/drive/config.js');
        const config = await readFile(configPath, 'utf8');
        await writeFile(configPath, config.replace(/^export const GOOGLE_CLIENT_ID = .*;$/m,
            'export const GOOGLE_CLIENT_ID = ' + JSON.stringify(clientId) + ';'));
    }
    await cp(path.join(root, 'index.html'), path.join(dist, 'index.html'));
    await writeWorker(dist);
}
export async function writeWorker(dist) {
    const files = (await readdir(dist, { recursive: true, withFileTypes: true })).filter(e => e.isFile() && e.name !== 'sw.js').map(e => path.relative(dist, path.join(e.parentPath, e.name)).split(path.sep).join('/')).sort();
    const hash = createHash('sha256');
    for (const file of files) {
        hash.update(file);
        hash.update(await readFile(path.join(dist, file)));
    }
    const version = hash.digest('hex').slice(0, 16);
    const sw = `const cachePrefix='artheus-'+self.registration.scope+'-';
const cacheName=cachePrefix+'${version}';
const assets=${JSON.stringify(files.map(f => './' + f))};
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(cacheName);await cache.addAll(assets.map(path=>new Request(path,{cache:'reload'})));await self.skipWaiting();})());});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys()){if(name.startsWith(cachePrefix)&&name!==cacheName)await caches.delete(name);}await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||event.request.headers?.has('Authorization')||!event.request.url.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{const cache=await caches.open(cacheName);const key=event.request.mode==='navigate'?'./index.html':event.request;const hit=await cache.match(key);return hit||fetch(event.request);})());
});\n`;
    await writeFile(path.join(dist, 'sw.js'), sw);
    console.log('Build pronto · ' + files.length + ' recursos locais · ' + version);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
    await build();
