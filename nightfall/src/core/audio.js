// All audio is synthesized with Web Audio — no asset files required.
import { S, P } from './state.js';

let A, mg, tens;

export function initAudio() {
  if (A) { if (A.state === 'suspended') A.resume(); return; }
  A = new (window.AudioContext || window.webkitAudioContext)();
  mg = A.createGain(); mg.gain.value = S.mute ? 0 : S.vol; mg.connect(A.destination);
  [43, 64.5].forEach((f, i) => {
    const o = A.createOscillator(); o.type = i ? 'triangle' : 'sawtooth'; o.frequency.value = f;
    const g = A.createGain(); g.gain.value = 0.05;
    const lp = A.createBiquadFilter(); lp.frequency.value = 140;
    o.connect(lp); lp.connect(g); g.connect(mg); o.start();
  });
  const b = A.createOscillator(); b.type = 'square'; b.frequency.value = 100;
  const bg = A.createGain(); bg.gain.value = 0.004; b.connect(bg); bg.connect(mg); b.start();
  const t = A.createOscillator(); t.type = 'sawtooth'; t.frequency.value = 78;
  tens = A.createGain(); tens.gain.value = 0;
  const tl = A.createBiquadFilter(); tl.frequency.value = 260;
  t.connect(tl); tl.connect(tens); tens.connect(mg); t.start();
  (function clang() {
    if (S.state === 'play') tone(180 + Math.random() * 300, 1.4, 'triangle', 0.05, spat(Math.random() * 30 - 5, Math.random() * 30 - 10));
    setTimeout(clang, 5000 + Math.random() * 9000);
  })();
}
export function setVolume() { if (mg) mg.gain.value = S.mute ? 0 : S.vol; }
export function setTension(target, dt) { if (tens) tens.gain.value += (target - tens.gain.value) * dt * 2; }

function spat(x, z) {
  const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz) + 0.01, p = A.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, (dx * Math.cos(S.yaw) - dz * Math.sin(S.yaw)) / d));
  p.connect(mg);
  return { n: p, v: 1 / (1 + d * 0.3) };
}
export function tone(f, dur, type, vol, sp, f2) {
  if (!A) return;
  const o = A.createOscillator(), g = A.createGain();
  o.type = type; o.frequency.setValueAtTime(f, A.currentTime);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, A.currentTime + dur);
  g.gain.setValueAtTime(vol * (sp ? sp.v : 1), A.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, A.currentTime + dur);
  o.connect(g); g.connect(sp ? sp.n : mg); o.start(); o.stop(A.currentTime + dur);
}
export function burst(freq, dur, vol, sp) {
  if (!A) return;
  const b = A.createBuffer(1, A.sampleRate * dur | 0, A.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = A.createBufferSource(); s.buffer = b;
  const f = A.createBiquadFilter(); f.frequency.value = freq;
  const g = A.createGain(); g.gain.value = vol * (sp ? sp.v : 1);
  s.connect(f); f.connect(g); g.connect(sp ? sp.n : mg); s.start();
}
export const sfx = {
  pick: () => tone(660, 0.15, 'sine', 0.15, 0, 990),
  deny: () => tone(110, 0.3, 'square', 0.12),
  click: () => tone(900, 0.05, 'square', 0.1),
  door: () => { burst(300, 0.6, 0.5); tone(70, 0.5, 'sawtooth', 0.2); },
  playerStep: (run, crouch) => burst(run ? 600 : crouch ? 250 : 420, 0.1, run ? 0.5 : crouch ? 0.1 : 0.28),
  step: (x, z, v, f) => { if (A) burst(f, 0.12, v, spat(x, z)); },
  growl: (x, z) => { if (A) tone(70, 1.1, 'sawtooth', 0.35, spat(x, z), 32); },
  sting: () => { tone(220, 1.2, 'sawtooth', 0.2); tone(233, 1.2, 'sawtooth', 0.2); tone(110, 1.5, 'square', 0.15, 0, 55); }
};
