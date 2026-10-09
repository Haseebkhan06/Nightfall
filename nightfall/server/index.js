// PROJECT: NIGHTFALL backend — zero dependencies (Node >= 18).
//   GET    /api/health
//   GET    /api/save/:id     PUT /api/save/:id     DELETE /api/save/:id
//   GET    /api/scores       POST /api/scores
// In production it also serves the built frontend from ../dist.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.map': 'application/json', '.woff2': 'font/woff2' };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const ID = /^[A-Za-z0-9_-]{8,64}$/;
const err = (code, msg) => Object.assign(new Error(msg), { code });

function readBody(req, max = 100_000) {
  return new Promise((resolve, reject) => {
    let n = 0, over = false; const chunks = [];
    req.on('data', d => {
      if (over) return;                       // drain remaining upload, don't buffer it
      n += d.length;
      if (n > max) { over = true; chunks.length = 0; reject(err(413, 'payload too large')); } else chunks.push(d);
    });
    req.on('end', () => { if (over) return; try { resolve(JSON.parse(Buffer.concat(chunks).toString() || 'null')); } catch { reject(err(400, 'invalid JSON')); } });
    req.on('error', reject);
  });
}

const isNum = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const keyList = a => Array.isArray(a) && a.length <= 40 && a.every(k => typeof k === 'string' && /^[a-z0-9]{2,8}$/.test(k));
function validSave(b) {
  return b && typeof b === 'object' && b.v === 1 && isNum(b.t, 0, 9e15) &&
    Array.isArray(b.inv) && b.inv.length <= 10 && b.inv.every(i => typeof i === 'string' && i.length < 16) &&
    isNum(b.obj, 0, 5) && isNum(b.bat, 0, 100) && typeof b.hasFl === 'boolean' && typeof b.labOpen === 'boolean' &&
    keyList(b.picked) && keyList(b.opened) && Array.isArray(b.pos) && b.pos.length === 2 && b.pos.every(p => isNum(p, -100, 100)) &&
    isNum(b.yaw, -1000, 1000) && isNum(b.time, 0, 604800);
}
function cleanScore(b) {
  if (!b || typeof b !== 'object') throw err(400, 'invalid score');
  const name = String(b.name || '').replace(/[^\w \-.]/g, '').trim().slice(0, 16);
  if (!name) throw err(400, 'name required');
  if (!ID.test(String(b.id))) throw err(400, 'invalid id');
  if (!isNum(b.time, 15, 86400)) throw err(400, 'invalid time'); // under 15s is not humanly possible
  if (!['A', 'B', 'C'].includes(b.ending)) throw err(400, 'invalid ending');
  return { id: b.id, name, time: Math.round(b.time * 10) / 10, ending: b.ending, at: Date.now() };
}

export function createApp({ dataDir = process.env.DATA_DIR || path.join(here, 'data'), distDir = path.join(here, '..', 'dist') } = {}) {
  const store = new Store(dataDir);
  const hits = new Map(); // naive per-IP rate limit: 120 req / minute
  setInterval(() => hits.clear(), 60_000).unref();

  const json = (res, code, obj) => {
    const b = JSON.stringify(obj);
    res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b), ...CORS });
    res.end(b);
  };

  async function api(req, res, url) {
    const ip = req.socket.remoteAddress || '?';
    const n = (hits.get(ip) || 0) + 1; hits.set(ip, n);
    if (n > 120) throw err(429, 'rate limited');
    const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
    const [, res1, id] = parts;

    if (res1 === 'health' && req.method === 'GET') return json(res, 200, { ok: true });

    if (res1 === 'save' && id) {
      if (!ID.test(id)) throw err(400, 'invalid id');
      if (req.method === 'GET') { const s = store.getSave(id); return s ? json(res, 200, s) : json(res, 404, { error: 'no save' }); }
      if (req.method === 'PUT') {
        const b = await readBody(req);
        if (!validSave(b)) throw err(400, 'invalid save');
        store.setSave(id, b); return json(res, 200, { ok: true });
      }
      if (req.method === 'DELETE') { store.delSave(id); return json(res, 200, { ok: true }); }
    }
    if (res1 === 'scores') {
      if (req.method === 'GET') return json(res, 200, { scores: store.topScores(10) });
      if (req.method === 'POST') {
        const s = cleanScore(await readBody(req));
        store.addScore(s);
        return json(res, 200, { id: s.id, scores: store.topScores(10) });
      }
    }
    throw err(404, 'not found');
  }

  function serveStatic(req, res, url) {
    if (!fs.existsSync(distDir)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Frontend not built. Run: npm run build'); }
    let rel = decodeURIComponent(url.pathname);
    let file = path.normalize(path.join(distDir, rel));
    if (!file.startsWith(distDir)) { res.writeHead(403); return res.end('forbidden'); } // path traversal guard
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(distDir, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, url);
      json(res, 405, { error: 'method not allowed' });
    } catch (e) {
      const code = e.code && Number.isInteger(e.code) ? e.code : 500;
      if (code === 500) console.error(e);
      if (!res.headersSent) json(res, code, { error: code === 500 ? 'server error' : e.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3001;
  createApp().listen(port, () => console.log(`NIGHTFALL server on http://localhost:${port}`));
}
