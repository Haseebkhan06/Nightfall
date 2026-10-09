// Run: npm run test:server   (uses a temp data dir and a random port)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from './index.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightfall-'));
const server = createApp({ dataDir: dir, distDir: path.join(dir, 'none') });
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}/api`;
const call = (p, method = 'GET', body) => fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
const id = 'testplayer_12345';
const save = { v: 1, t: Date.now(), inv: ['flash'], obj: 1, bat: 80, hasFl: true, labOpen: false, picked: ['flash'], opened: [], pos: [1, 2], yaw: 0, time: 42 };

let r = await call('/health'); assert.equal(r.status, 200);
r = await call(`/save/${id}`); assert.equal(r.status, 404);
r = await call(`/save/${id}`, 'PUT', save); assert.equal(r.status, 200);
r = await call(`/save/${id}`); assert.deepEqual(await r.json(), save);
r = await call(`/save/${id}`, 'PUT', { ...save, bat: 9999 }); assert.equal(r.status, 400, 'rejects out-of-range save');
r = await call(`/save/${id}`, 'PUT', '{not json'); assert.equal(r.status, 400, 'rejects malformed JSON');
r = await call('/save/bad id!', 'GET'); assert.equal(r.status, 400, 'rejects bad id');
r = await call(`/save/${id}`, 'PUT', 'x'.repeat(200_000)); assert.equal(r.status, 413, 'rejects huge body');
r = await call(`/save/${id}`, 'DELETE'); assert.equal(r.status, 200);
r = await call(`/save/${id}`); assert.equal(r.status, 404);

r = await call('/scores', 'POST', { id, name: 'Ripley<script>', time: 300.44, ending: 'A' }); assert.equal(r.status, 200);
let j = await r.json(); assert.equal(j.scores[0].name, 'Ripleyscript', 'name sanitized');
await call('/scores', 'POST', { id: 'other_player_01', name: 'Fast', time: 120, ending: 'A' });
await call('/scores', 'POST', { id, name: 'Ripley', time: 400, ending: 'A' }); // slower: ignored
r = await call('/scores'); j = await r.json();
assert.deepEqual(j.scores.map(s => s.name), ['Fast', 'Ripleyscript'], 'sorted, best per player kept');
r = await call('/scores', 'POST', { id, name: 'Cheater', time: 1, ending: 'A' }); assert.equal(r.status, 400, 'rejects impossible time');
r = await call('/nope'); assert.equal(r.status, 404);

// persistence across restart + corrupt file recovery
server.close();
const again = createApp({ dataDir: dir });
await new Promise(r => again.listen(0, r));
const j2 = await (await fetch(`http://localhost:${again.address().port}/api/scores`)).json();
assert.equal(j2.scores.length, 2, 'scores persist');
again.close();
fs.writeFileSync(path.join(dir, 'db.json'), '{corrupt');
const third = createApp({ dataDir: dir });
await new Promise(r => third.listen(0, r));
const j3 = await (await fetch(`http://localhost:${third.address().port}/api/scores`)).json();
assert.equal(j3.scores.length, 0, 'recovers from corrupt db');
third.close();
console.log('All server tests passed ✔');
process.exit(0);
