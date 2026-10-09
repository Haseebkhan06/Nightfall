// Thin client for the Node backend. Every call fails soft: the game still
// works offline using localStorage.
const BASE = '/api';

export function playerId() {
  let id = null;
  try { id = localStorage.getItem('nightfall.pid'); } catch {}
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^A-Za-z0-9_-]/g, '');
    try { localStorage.setItem('nightfall.pid', id); } catch {}
  }
  return id;
}

async function req(path, opts = {}, ms = 2500) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(BASE + path, {
      ...opts, signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    });
    if (r.status === 404) return { ok: false, status: 404 };
    if (!r.ok) return { ok: false, status: r.status };
    return { ok: true, data: await r.json() };
  } catch { return { ok: false, status: 0 }; }
  finally { clearTimeout(t); }
}

export const health = async () => (await req('/health', {}, 1500)).ok;
export const saveRemote = data => req(`/save/${playerId()}`, { method: 'PUT', body: JSON.stringify(data) });
export const loadRemote = async () => { const r = await req(`/save/${playerId()}`); return r.ok ? r.data : null; };
export const deleteRemote = () => req(`/save/${playerId()}`, { method: 'DELETE' });
export const getScores = async () => { const r = await req('/scores'); return r.ok ? r.data.scores : []; };
export const postScore = async s => { const r = await req('/scores', { method: 'POST', body: JSON.stringify(s) }); return r.ok ? r.data : null; };
