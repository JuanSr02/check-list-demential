// Servidor para probar en tu PC sin Vercel:  APP_SECRET=1234 npm run dev  → http://localhost:3000
// Sirve los archivos y la función /api/state (guarda en memoria si no hay Redis configurado).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import * as api from './api/state.js';

const PORT = Number(process.env.PORT || 3000);
const root = new URL('.', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  if (url.pathname === '/api/state') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const handler = api[req.method];
    const r = handler ? await handler(request) : new Response('Method not allowed', { status: 405 });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  const rel = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
  if (rel.startsWith('/api/') || rel.includes('node_modules')) { res.writeHead(404); res.end(); return; }
  try {
    const data = await readFile(join(root, rel));
    res.writeHead(200, { 'content-type': TYPES[extname(rel)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('No encontrado'); }
}).listen(PORT, () => console.log('Plantilla en http://localhost:' + PORT));
