import { S, keys } from '../core/state.js';
import { R } from '../core/scene.js';
import { sfx } from '../core/audio.js';
import { toggleInv, showPause } from '../core/ui.js';
import { E } from './enemy.js';
import { interact } from './player.js';

export function initInput() {
  addEventListener('mousemove', e => {
    if (document.pointerLockElement && E.s !== 'ATTACK' && !S.paused) {
      S.yaw -= e.movementX * 0.0022;
      S.pitch = Math.max(-1.4, Math.min(1.4, S.pitch - e.movementY * 0.0022));
    }
  });
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Tab') e.preventDefault();
    if (S.state !== 'play' || S.paused) return;
    if (e.code === 'KeyF' && S.hasFl && (S.bat > 0 || S.flash)) { S.flash = !S.flash; sfx.click(); }
    if (e.code === 'KeyE') interact();
    if (e.code === 'Tab' || e.code === 'KeyI') toggleInv();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && S.state === 'play') { S.paused = true; showPause(true); }
  });
}
export const lock = () => R.domElement.requestPointerLock();
