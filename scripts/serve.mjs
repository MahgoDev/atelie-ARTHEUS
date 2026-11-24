import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { build } from './build.mjs';
const root = fileURLToPath(new URL('../', import.meta.url)), base = '/Atelie-ARTHEUS/', port = Number(process.env.PORT || 4173);
if (process.argv.includes('--dev'))
    await build();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/' || url.pathname === base.slice(0, -1)) {
            res.writeHead(302, { Location: base });
            return res.end();
        }
        if (!url.pathname.startsWith(base)) {
            res.writeHead(404);
            return res.end();
        }
        const sub = decodeURIComponent(url.pathname.slice(base.length)) || 'index.html';
        const dist = path.resolve(root, 'dist'), file = path.resolve(dist, sub);
        if (!file.startsWith(dist + path.sep) || !(await stat(file)).isFile()) {
            res.writeHead(404);
            return res.end();
        }
        const bytes = await readFile(file);
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(bytes);
    }
    catch {
        res.writeHead(404);
        res.end();
    }
});
server.listen(port, '127.0.0.1', () => {
    const address = 'http://127.0.0.1:' + port + base;
    console.log('Ateliê ARTHEUS · ' + address);
    if (process.argv.includes('--open') && process.platform === 'win32') {
        const opener = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', address], { detached: true, stdio: 'ignore', windowsHide: true });
        opener.on('error', () => console.log('Abra o endereço acima no navegador.'));
        opener.unref();
    }
});
