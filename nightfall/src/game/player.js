import { cam, fl } from '../core/scene.js';
import { S, P, keys } from '../core/state.js';
import { move } from '../core/physics.js';
import { sfx } from '../core/audio.js';
import { toast, setPrompt } from '../core/ui.js';
import { focus } from './interactions.js';

let foc = null;
export const interact = () => foc && foc.act();

export function player(dt) {
  S.crouch = !!(keys.ControlLeft || keys.KeyC) && !S.hidden;
  const ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const mv = (ix || iz) && !S.hidden;
  const run = keys.ShiftLeft && mv && !S.crouch && S.stam > 0 && !S.tired;
  const sp = S.crouch ? 1.5 : run ? 5.4 : 3;

  if (run) S.stam -= 22 * dt; else S.stam = Math.min(100, S.stam + (mv ? 9 : 16) * dt);
  if (S.stam <= 0) S.tired = true; if (S.stam > 35) S.tired = false; S.stam = Math.max(0, S.stam);

  if (mv) {
    const l = Math.hypot(ix, iz), s = Math.sin(S.yaw), c = Math.cos(S.yaw), k = sp * dt / l;
    move(P, (c * ix - s * iz) * k, (-s * ix - c * iz) * k, 0.35);
    S.bob += sp * dt * 2.2;
  }
  S.noise = mv ? (run ? 14 : S.crouch ? 2.5 : 7) : 0;
  S.stepT -= dt;
  if (mv && S.stepT <= 0) { S.stepT = run ? 0.3 : S.crouch ? 0.75 : 0.5; sfx.playerStep(run, S.crouch); }

  const te = S.hidden ? 1.5 : S.crouch ? 1.0 : 1.7; S.eye += (te - S.eye) * dt * 8;
  cam.position.set(P.x, S.eye + (mv ? Math.sin(S.bob) * 0.03 : 0), P.z);
  cam.rotation.set(S.pitch, S.yaw, 0);

  if (S.flash) { S.bat -= dt * 0.7; if (S.bat <= 0) { S.bat = 0; S.flash = false; toast('Flashlight battery dead', true); } }
  fl.intensity = S.flash ? (S.bat < 20 && Math.random() < 0.12 ? 0.3 : 2.4) : 0;

  foc = focus();
  setPrompt(foc ? '[E] ' + foc.label : null);
}
