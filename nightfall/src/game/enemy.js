import * as THREE from 'three';
import { scene } from '../core/scene.js';
import { S, P, hooks } from '../core/state.js';
import { los, move, angD } from '../core/physics.js';
import { sfx, setTension } from '../core/audio.js';
import { toast } from '../core/ui.js';

export const E = { x: 19, z: 2, ry: Math.PI, s: 'PATROL', path: [], aware: 0, t: 0, pi: 0, wait: 0, last: [19, 2], lost: 0, ph: 0, st: 0, spd: 0, rp: 0 };

// ---- procedural creature model ----
const mk = (g, w, h, d, x, y, z, c = 0x141a16, e = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.25, emissive: e }));
  m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
};
const EM = new THREE.Group(), torso = new THREE.Group(), legs = [], arms = [];
torso.position.y = 1.05; torso.rotation.x = 0.4; EM.add(torso);
mk(torso, 0.62, 0.85, 0.36, 0, 0.45, 0); mk(torso, 0.3, 0.3, 0.3, 0, 1.0, 0.1, 0x0e1210);
mk(torso, 0.07, 0.05, 0.04, -0.07, 1.03, 0.26, 0xff4020, 0xff2a10); mk(torso, 0.07, 0.05, 0.04, 0.07, 1.03, 0.26, 0xff4020, 0xff2a10);
mk(torso, 0.12, 0.2, 0.12, 0, 0.85, 0.05, 0x1a2420);
for (const s of [-1, 1]) {
  const a = new THREE.Group(); a.position.set(s * 0.4, 0.8, 0); torso.add(a); mk(a, 0.14, 1.1, 0.14, 0, -0.55, 0, 0x101612); arms.push(a);
  const l = new THREE.Group(); l.position.set(s * 0.16, 1.0, 0); EM.add(l); mk(l, 0.2, 1.0, 0.22, 0, -0.5, 0); legs.push(l);
}
mk(arms[1], 0.06, 0.95, 0.06, 0, -1.05, 0.08, 0x555a58); // pipe
scene.add(EM);

// ---- waypoint graph ----
const nodes = [[-5, 2], [1, 2], [8, 2], [8, -5], [19, 2], [19, 9], [23, 2]];
const edges = [[0, 1], [1, 2], [2, 3], [2, 4], [4, 6]];
const route = [4, 6, 4, 2, 3, 2, 1, 0, 1, 2];
let labLinked = false;
export function unlockLab() { if (labLinked) return; labLinked = true; edges.push([4, 5]); route.push(4, 5, 4); }
hooks.unlockLab = unlockLab;

const near = (x, z) => { let b = 0, bd = 1e9; nodes.forEach((n, i) => { const d = Math.hypot(n[0] - x, n[1] - z); if (d < bd) { bd = d; b = i; } }); return b; };
function bfs(a, b) {
  const prev = { [a]: -1 }, q = [a];
  while (q.length) {
    const c = q.shift(); if (c === b) break;
    for (const [u, v] of edges) { const n = u === c ? v : v === c ? u : -1; if (n >= 0 && !(n in prev)) { prev[n] = c; q.push(n); } }
  }
  const p = []; for (let c = b; c !== -1 && c !== undefined; c = prev[c]) p.unshift(nodes[c]); return p;
}
function setPath(x, z) { E.path = los(E.x, E.z, x, z) ? [[x, z]] : bfs(near(E.x, E.z), near(x, z)).concat([[x, z]]); }
function go(tx, tz, sp, dt) {
  const dx = tx - E.x, dz = tz - E.z, d = Math.hypot(dx, dz); if (d < 0.01) return d;
  E.ry += angD(Math.atan2(dx, dz) - E.ry) * Math.min(1, dt * 6);
  const s = Math.min(d, sp * dt); move(E, dx / d * s, dz / d * s, 0.45); E.spd = sp; return d;
}
function follow(sp, dt) { if (!E.path.length) return true; const p = E.path[0]; if (go(p[0], p[1], sp, dt) < 0.5) E.path.shift(); return !E.path.length; }
function setS(s) { E.s = s; E.t = 0; if (s === 'CHASE') { sfx.sting(); sfx.growl(E.x, E.z); } }

// Sound events (doors, pickups, player noise) — attenuated through walls.
export function noise(x, z, r) {
  const d = Math.hypot(x - E.x, z - E.z);
  if (d < r * (los(x, z, E.x, E.z) ? 1 : 0.6) && E.s !== 'CHASE' && E.s !== 'ATTACK') {
    E.last = [x, z]; setPath(x, z); setS('INVESTIGATE');
  }
}
hooks.noise = noise;

export function resetEnemy() {
  E.x = 19; E.z = 2; E.s = 'PATROL'; E.aware = 0; E.path = []; E.pi = 0; E.wait = 0; EM.position.set(E.x, 0, E.z);
}

export function enemy(dt, T) {
  const dx = P.x - E.x, dz = P.z - E.z, d = Math.hypot(dx, dz); E.t += dt; E.spd = 0;
  const range = (S.flash ? 16 : 11) * (S.crouch ? 0.6 : 1);
  const inCone = Math.abs(angD(Math.atan2(dx, dz) - E.ry)) < 1.1, clear = los(E.x, E.z, P.x, P.z);
  const see = !S.hidden && clear && ((d < range && inCone) || d < 2.2);
  const live = E.s !== 'CHASE' && E.s !== 'ATTACK';

  if (live && !S.hidden && S.noise > 0 && d < S.noise * (clear ? 1 : 0.6)) {
    E.last = [P.x, P.z]; setPath(P.x, P.z);
    if (E.s !== 'INVESTIGATE') sfx.growl(E.x, E.z);
    setS('INVESTIGATE');
  }
  E.aware = Math.max(0, Math.min(1, E.aware + (see ? dt * (d < 6 ? 1.3 : 0.6) : -dt * 0.25)));
  if (live && see && E.aware > 0.3 && E.s !== 'INVESTIGATE') E.ry += angD(Math.atan2(dx, dz) - E.ry) * dt * 4;
  if (live && E.aware >= 1) { E.last = [P.x, P.z]; setPath(P.x, P.z); setS('CHASE'); }

  if (E.s === 'PATROL') {
    const n = nodes[route[E.pi % route.length]];
    if (E.wait > 0) E.wait -= dt; else if (go(n[0], n[1], 1.5, dt) < 0.6) { E.pi++; E.wait = 0.8; }
  } else if (E.s === 'INVESTIGATE') {
    if (follow(2.3, dt)) setS('SEARCH');
  } else if (E.s === 'SEARCH') {
    E.ry += dt * 1.3;
    if (S.hidden && d < 2.2) S.found += dt; else S.found = Math.max(0, S.found - dt);
    if (S.found > 2.5) { S.found = 0; toast('It found you.', true); setS('ATTACK'); }
    if (E.t > 6) { const n = nodes[route[E.pi % route.length]]; setPath(n[0], n[1]); setS('RETURN'); }
  } else if (E.s === 'RETURN') {
    if (follow(1.8, dt)) setS('PATROL');
  } else if (E.s === 'CHASE') {
    if (see) { E.last = [P.x, P.z]; E.lost = 0; E.rp = 0; go(P.x, P.z, 4.2, dt); if (d < 1.4) setS('ATTACK'); }
    else {
      E.lost += dt; E.rp -= dt;
      if (E.rp <= 0) { setPath(E.last[0], E.last[1]); E.rp = 0.6; }
      if (follow(4, dt) && E.lost > 2.5) { S.found = 0; setS('SEARCH'); }
    }
  } else if (E.s === 'ATTACK') {
    go(P.x, P.z, 1.5, dt);
    const target = Math.atan2(-(E.x - P.x), -(E.z - P.z));
    if (!S.hidden) S.yaw += angD(target - S.yaw) * dt * 6;
    S.pitch *= 0.9;
    if (E.t > 0.9) hooks.over();
  }

  setTension(E.s === 'CHASE' ? 0.12 : E.aware > 0.3 ? 0.05 : 0, dt);
  E.ph += E.spd * dt * 2.4;
  const sw = Math.sin(E.ph) * (E.spd ? 0.7 : 0);
  legs[0].rotation.x = sw; legs[1].rotation.x = -sw; arms[0].rotation.x = -sw * 0.6; arms[1].rotation.x = sw * 0.4 - 0.2;
  torso.rotation.x = 0.4 + (E.s === 'CHASE' ? 0.25 : 0);
  E.st += E.spd * dt; if (E.st > 1.3) { E.st = 0; sfx.step(E.x, E.z, 0.9, 220); }
  EM.position.set(E.x, 0, E.z); EM.rotation.y = E.ry;
  if (Math.random() < dt * 0.08) sfx.growl(E.x, E.z);
}
