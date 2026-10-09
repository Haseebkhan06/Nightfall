import * as THREE from 'three';
import { scene, cam } from '../core/scene.js';
import { S, P, hooks, has, adv, NAMES } from '../core/state.js';
import { col, los } from '../core/physics.js';
import { box, pm } from './world.js';
import { sfx } from '../core/audio.js';
import { toast } from '../core/ui.js';

export const CATALOG = {
  flash: { name: 'Flashlight', desc: 'Press F to toggle. Battery is limited.' },
  card: { name: 'Security Card', desc: 'Opens the laboratory door.' },
  ekey: { name: 'Emergency Key', desc: 'Manual override for the exit blast door.' }
};
export const inter = [];
const items = {}, doors = {};
const give = id => S.inv.push({ id, ...CATALOG[id] });

function item(key, name, x, y, z, color, take) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.18),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 }));
  m.position.set(x, y, z); scene.add(m);
  const o = {
    pos: m.position, label: 'Take ' + name,
    remove() { scene.remove(m); const i = inter.indexOf(o); if (i >= 0) inter.splice(i, 1); },
    act() { o.remove(); S.picked.push(key); hooks.noise(x, z, 4); sfx.pick(); take(); hooks.save(); }
  };
  inter.push(o); items[key] = o;
}
function door(key, x1, z1, x2, z2, need, label, done) {
  const m = box(x1, z1, x2, z2, 3.2, pm(0x3a2220, 0x200505));
  const o = {
    pos: new THREE.Vector3((x1 + x2) / 2, 1.4, (z1 + z2) / 2), label: 'Open ' + label,
    remove() { scene.remove(m); const c = col.indexOf(m.b); if (c >= 0) col.splice(c, 1); const i = inter.indexOf(o); if (i >= 0) inter.splice(i, 1); },
    act() {
      if (!has(need)) { toast(`${label} is locked — requires ${NAMES[need]}`, true); sfx.deny(); return; }
      o.remove(); S.opened.push(key); hooks.noise(o.pos.x, o.pos.z, 12); sfx.door(); done(); hooks.save();
    }
  };
  inter.push(o); doors[key] = o;
}

export function buildInteractables() {
  item('flash', 'Flashlight', -7.2, 0.95, 5.3, 0xffffcc, () => { S.hasFl = true; give('flash'); adv(0); toast('Flashlight acquired — press F'); });
  item('card', 'Security Card', 9.75, 1.25, -5.25, 0x40e0ff, () => { give('card'); adv(1); toast('Picked up: Security Card'); });
  item('ekey', 'Emergency Key', 21.7, 0.95, 13, 0xff8030, () => { give('ekey'); adv(3); toast('Picked up: Emergency Key — get to the exit!'); });
  [['bat0', -9.2, 0.3, -1.2], ['bat1', 5.5, 1.0, -2.5], ['bat2', 15.5, 0.3, 0.6], ['bat3', 22.5, 0.3, 10]]
    .forEach(([k, x, y, z]) => item(k, 'Battery', x, y, z, 0x9cff5a, () => { S.bat = Math.min(100, S.bat + 50); toast('Battery installed (+50%)'); }));

  inter.push({
    pos: new THREE.Vector3(-9.9, 1.2, 2), label: 'Read maintenance log',
    act() { toast("MAINT LOG: Subject 7 breached containment. Lab key is in the lab. Card is in Storage. Don't run. It listens.", false, 9000); sfx.pick(); }
  });

  door('lab', 18, 3.8, 20, 4.2, 'card', 'Laboratory door', () => { S.labOpen = true; hooks.unlockLab(); adv(2); toast('Laboratory unlocked'); });
  door('exit', 25.6, 0.9, 26.2, 3.1, 'ekey', 'Exit blast door', () => { adv(4); hooks.win(); });

  // hiding locker
  inter.push({
    pos: new THREE.Vector3(11.35, 1.2, -2.55),
    get label() { return S.hidden ? 'Leave locker' : 'Hide in locker'; },
    act() {
      if (S.hidden) { S.hidden = false; P.x = S.px; P.z = S.pz; sfx.door(); return; }
      S.px = P.x; S.pz = P.z; S.hidden = true; P.x = 11.35; P.z = -2.55; S.yaw = Math.PI / 2; S.pitch = 0;
      sfx.door(); toast('Hiding. Stay still. Press E to leave.');
    }
  });
}

// Re-apply persisted world state after loading a save.
export function applyWorldState() {
  S.picked.forEach(k => items[k] && items[k].remove());
  S.opened.forEach(k => doors[k] && doors[k].remove());
}

export function focus() {
  let best = null, bd = 0.93;
  const c = Math.cos(S.pitch), f = new THREE.Vector3(-Math.sin(S.yaw) * c, Math.sin(S.pitch), -Math.cos(S.yaw) * c);
  for (const o of inter) {
    const dx = o.pos.x - P.x, dz = o.pos.z - P.z, dy = o.pos.y - cam.position.y, d = Math.hypot(dx, dz);
    if (d > 2.6) continue;
    const dot = (f.x * dx + f.y * dy + f.z * dz) / Math.hypot(d, dy);
    if (dot < bd) continue;
    if (d > 0.7 && !S.hidden) { const k = (d - 0.6) / d; if (!los(P.x, P.z, P.x + dx * k, P.z + dz * k)) continue; }
    bd = dot; best = o;
  }
  return best;
}
