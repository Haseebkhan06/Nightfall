import * as THREE from 'three';
import { scene } from '../core/scene.js';
import { col } from '../core/physics.js';

export const lights = [];

const baseT = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#3a4a47'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    x.fillStyle = `rgba(${Math.random() < 0.5 ? 0 : 90},${60 + Math.random() * 60 | 0},60,.08)`;
    x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  x.strokeStyle = '#1c2624'; x.lineWidth = 3; x.strokeRect(0, 0, 128, 128);
  x.beginPath(); x.moveTo(0, 64); x.lineTo(128, 64); x.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
const tm = (rx, ry, color, rough, met) => {
  const t = baseT.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, color, roughness: rough, metalness: met });
};
export const pm = (c, e = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.3, emissive: e });

export function box(x1, z1, x2, z2, h, mat, y0 = 0, solid = true) {
  const w = x2 - x1, d = z2 - z1, m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x1 + w / 2, y0 + h / 2, z1 + d / 2);
  m.castShadow = m.receiveShadow = true; scene.add(m);
  m.b = [x1, z1, x2, z2]; if (solid) col.push(m.b);
  return m;
}
function wall(x1, z1, x2, z2) {
  const t = 0.2, len = Math.max(x2 - x1, z2 - z1), mat = tm(len / 3, 1, 0x88aaaa, 0.8, 0.3);
  if (z1 === z2) box(x1 - t, z1 - t, x2 + t, z1 + t, 3.2, mat);
  else box(x1 - t, z1 - t, x1 + t, z2 + t, 3.2, mat);
}
function lamp(x, z, c, i, mode) {
  const p = new THREE.PointLight(c, i, 13, 2); p.position.set(x, 2.7, z); scene.add(p);
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.2), new THREE.MeshBasicMaterial({ color: c }));
  m.position.set(x, 3.15, z); scene.add(m);
  lights.push({ p, m, i, mode, c: new THREE.Color(c), ph: Math.random() * 9 });
}

export function buildWorld() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 34), tm(14, 10, 0x6a8a85, 0.22, 0.75));
  floor.rotation.x = -Math.PI / 2; floor.position.set(8, 0, 2); floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(44, 34), pm(0x0c1211));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(8, 3.2, 2); scene.add(ceil);

  // start room
  wall(-10, -2, -2, -2); wall(-10, -2, -10, 6); wall(-10, 6, -2, 6); wall(-2, -2, -2, 0); wall(-2, 4, -2, 6);
  // corridor
  wall(-2, 0, 7, 0); wall(9, 0, 26, 0); wall(-2, 4, 18, 4); wall(20, 4, 26, 4); wall(26, 0, 26, 4);
  // storage + lab
  wall(4, -10, 12, -10); wall(4, -10, 4, 0); wall(12, -10, 12, 0);
  wall(14, 14, 24, 14); wall(14, 4, 14, 14); wall(24, 4, 24, 14);

  // pipes, hazard strips, ceiling ribs
  for (const z of [0.45, 3.55]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 28, 8), pm(0x25302e));
    p.rotation.z = Math.PI / 2; p.position.set(12, 2.9, z); scene.add(p);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(28, 0.12), pm(0x5a5320, 0x1a1805));
    s.rotation.x = -Math.PI / 2; s.position.set(12, 0.02, z + (z < 2 ? 0.3 : -0.3)); scene.add(s);
  }
  for (let x = 0; x < 26; x += 4) box(x, 0.2, x + 0.25, 3.8, 0.25, pm(0x1b2423), 2.95, false);

  // props (solid = cover)
  const crate = pm(0x3d4234);
  box(-8, 4.8, -6.5, 5.8, 0.9, pm(0x2b3331)); box(-9.7, -1.7, -8.6, -0.6, 1.1, crate);
  box(5, -9, 6.5, -7.5, 1.2, crate); box(9, -6, 10.5, -4.5, 1.2, crate); box(5, -3, 6, -2, 0.9, crate);
  box(13, 3, 14.4, 3.8, 1.2, crate); box(16, 0.2, 17, 1, 0.9, crate);
  box(15, 10, 17, 12, 1.6, pm(0x1c2a28, 0x061a16)); box(20.5, 12.2, 23, 13.8, 0.9, pm(0x2b3331));
  box(10.8, -3, 11.9, -2.1, 2, pm(0x22302c)); // hiding locker

  lamp(-6, 2, 0xff2a1a, 2.5, 'pulse'); lamp(2, 2, 0x30ff90, 1.6, 'flick'); lamp(10, 2, 0x40e0ff, 1.5, '');
  lamp(16, 2, 0x30ff90, 1.6, 'flick'); lamp(22, 2, 0xff2a1a, 2.5, 'pulse');
  lamp(8, -5, 0x40e0ff, 1.4, 'flick'); lamp(19, 9, 0x30ff90, 1.6, '');
}

export function updateLights(T) {
  for (const l of lights) {
    let v = 1;
    if (l.mode === 'flick') v = Math.random() < 0.03 ? 0.1 : 1;
    if (l.mode === 'pulse') v = 0.45 + 0.55 * Math.sin(T * 3 + l.ph);
    l.p.intensity = l.i * v;
    l.m.material.color.copy(l.c).multiplyScalar(0.3 + 0.7 * v);
  }
}
