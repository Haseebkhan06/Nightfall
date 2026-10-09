import './style.css';
import { Clock } from 'three';
import { S, hooks } from './core/state.js';
import { R, scene, cam, mount } from './core/scene.js';
import { initAudio } from './core/audio.js';
import * as ui from './core/ui.js';
import { buildWorld, updateLights } from './game/world.js';
import { buildInteractables } from './game/interactions.js';
import { E, enemy, resetEnemy } from './game/enemy.js';
import { player } from './game/player.js';
import { initInput, lock } from './game/input.js';
import { persist, fetchSave, clearSave, apply } from './game/save.js';
import { health, getScores, postScore, playerId } from './net/api.js';

let pending = null, T = 0, lastSave = 0;

try {
  mount(); buildWorld(); buildInteractables(); initInput();
} catch (e) { ui.$('err').textContent = 'Startup error: ' + e.message; console.error(e); }

async function saveNow(manual) {
  if (S.state !== 'play') return;
  const r = await persist();
  if (manual) ui.toast(r && r.ok ? 'Progress saved to server' : 'Saved locally (server offline)', false, 2000);
}
hooks.save = () => { saveNow(false); lastSave = T; };

hooks.over = () => {
  if (S.state !== 'play') return;
  S.state = 'over'; document.exitPointerLock();
  ui.showEnd({ title: 'YOU WERE TAKEN', color: '#ff3b30', body: 'The creature found you in the dark. Your last checkpoint is waiting in the main menu.' });
};
hooks.win = async () => {
  S.state = 'win'; document.exitPointerLock();
  clearSave();
  ui.showEnd({
    title: 'ENDING A — ESCAPE', win: true,
    body: `The override key turns. Cold night air floods the corridor. Behind you, something screams in the dark — but you are already running. Time: ${ui.fmt(S.time)}.`
  });
  ui.renderScores(await getScores());
};

function begin(data) {
  initAudio();
  if (data) apply(data);
  S.state = 'play'; S.paused = false;
  resetEnemy();
  ['menu', 'pause'].forEach(id => ui.$(id).classList.add('hide'));
  ui.showHud(true); lock();
  ui.toast(data ? 'Checkpoint restored.' : 'You wake in a damaged maintenance room. Find a light.', false, 4500);
  if (!data) { clearSave(); }
}

ui.initUI({
  onStart: () => begin(null),
  onContinue: () => pending && begin(pending),
  onResume: () => { ui.showPause(false); S.paused = false; lock(); },
  onSave: () => saveNow(true),
  onMenu: () => location.reload(),
  getScores,
  onSubmit: async () => {
    const name = ui.$('name').value.trim() || 'SURVIVOR';
    ui.$('submit').disabled = true;
    const r = await postScore({ id: playerId(), name, time: Math.round(S.time * 10) / 10, ending: 'A' });
    ui.renderScores(r ? r.scores : await getScores(), playerId());
    ui.$('nameRow').classList.add('hide');
  }
});

// Boot: probe backend, preload any save so the Continue click stays a user gesture.
(async () => {
  const online = await health();
  ui.setNet(online ? 'Server connected — progress syncs.' : 'Server offline — progress saves locally.');
  pending = await fetchSave();
  ui.showContinue(!!pending);
})();

const timer = new Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(timer.getDelta(), 0.05); T += dt;
  updateLights(T);
  if (S.state === 'play' && !S.paused) {
    S.time += dt; player(dt); enemy(dt, T);
    ui.updateHud(E.aware, E.s === 'CHASE', T);
    if (T - lastSave > 20) { lastSave = T; saveNow(false); }
  } else if (S.state === 'menu') {
    cam.position.set(2, 1.7, 2); cam.rotation.set(0, Math.sin(T * 0.2) * 0.4 - 1.2, 0);
  }
  R.render(scene, cam);
}
loop();
