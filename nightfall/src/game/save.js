import { S, P } from '../core/state.js';
import { hit } from '../core/physics.js';
import { CATALOG, applyWorldState } from './interactions.js';
import { saveRemote, loadRemote, deleteRemote } from '../net/api.js';

const KEY = 'nightfall.save.v1';
const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

export function snapshot() {
  return {
    v: 1, t: Date.now(),
    inv: S.inv.map(i => i.id), obj: S.obj, bat: S.bat, hasFl: S.hasFl, labOpen: S.labOpen,
    picked: S.picked, opened: S.opened, pos: S.hidden ? [S.px, S.pz] : [P.x, P.z],
    yaw: S.yaw, time: S.time
  };
}

// Defensive parse: any malformed save returns null instead of throwing.
export function sanitize(d) {
  try {
    if (!d || typeof d !== 'object' || d.v !== 1) return null;
    const inv = (Array.isArray(d.inv) ? d.inv : []).filter((id, i, a) => CATALOG[id] && a.indexOf(id) === i);
    const keys = a => (Array.isArray(a) ? a : []).filter(k => typeof k === 'string' && /^[a-z0-9]{2,8}$/.test(k)).slice(0, 40);
    return {
      v: 1, t: num(d.t, 0, 9e15, 0), inv, obj: Math.round(num(d.obj, 0, 5, 0)), bat: num(d.bat, 0, 100, 100),
      hasFl: !!d.hasFl && inv.includes('flash'), labOpen: !!d.labOpen, picked: keys(d.picked), opened: keys(d.opened),
      pos: [num(d.pos && d.pos[0], -40, 40, -8), num(d.pos && d.pos[1], -40, 40, 1)],
      yaw: num(d.yaw, -100, 100, -Math.PI / 2), time: num(d.time, 0, 86400 * 7, 0)
    };
  } catch { return null; }
}

export function apply(d) {
  S.inv = d.inv.map(id => ({ id, ...CATALOG[id] }));
  S.obj = d.obj; S.bat = d.bat; S.hasFl = d.hasFl; S.labOpen = d.labOpen;
  S.picked = d.picked; S.opened = d.opened; S.time = d.time; S.yaw = d.yaw; S.pitch = 0;
  const [x, z] = d.pos;
  if (hit(x, z, 0.4)) { P.x = -8; P.z = 1; } else { P.x = x; P.z = z; } // never restore inside a wall
  applyWorldState();
}

export async function persist() {
  const data = snapshot();
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  return saveRemote(data);
}
// Newest of server/local wins; corrupt entries are ignored.
export async function fetchSave() {
  let local = null;
  try { local = sanitize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch {}
  const remote = sanitize(await loadRemote());
  const best = [local, remote].filter(Boolean).sort((a, b) => b.t - a.t)[0];
  return best || null;
}
export async function clearSave() {
  try { localStorage.removeItem(KEY); } catch {}
  return deleteRemote();
}
