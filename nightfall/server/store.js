// Tiny JSON-file datastore with atomic writes and corruption recovery.
import fs from 'node:fs';
import path from 'node:path';

export class Store {
  constructor(dir) {
    this.file = path.join(dir, 'db.json');
    fs.mkdirSync(dir, { recursive: true });
    this.db = this.#load();
  }
  #load() {
    try {
      const d = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return {
        saves: d.saves && typeof d.saves === 'object' ? d.saves : {},
        scores: Array.isArray(d.scores) ? d.scores : []
      };
    } catch (e) {
      if (e.code !== 'ENOENT') { // corrupt file: keep a copy, start fresh
        try { fs.renameSync(this.file, `${this.file}.corrupt-${Date.now()}`); } catch {}
      }
      return { saves: {}, scores: [] };
    }
  }
  #flush() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.db));
    fs.renameSync(tmp, this.file); // atomic replace
  }
  getSave(id) { return this.db.saves[id] || null; }
  setSave(id, data) {
    if (!this.db.saves[id] && Object.keys(this.db.saves).length >= 5000) throw Object.assign(new Error('storage full'), { code: 507 });
    this.db.saves[id] = data; this.#flush();
  }
  delSave(id) { const had = id in this.db.saves; delete this.db.saves[id]; if (had) this.#flush(); return had; }
  addScore(s) {
    // one best score per player id
    const prev = this.db.scores.findIndex(x => x.id === s.id);
    if (prev >= 0) { if (this.db.scores[prev].time <= s.time) return; this.db.scores.splice(prev, 1); }
    this.db.scores.push(s);
    this.db.scores.sort((a, b) => a.time - b.time);
    this.db.scores = this.db.scores.slice(0, 100);
    this.#flush();
  }
  topScores(n = 10) { return this.db.scores.slice(0, n); }
}
