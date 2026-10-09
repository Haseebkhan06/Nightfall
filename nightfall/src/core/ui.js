import { S, OBJ } from './state.js';
import { setVolume } from './audio.js';

export const $ = id => document.getElementById(id);

// persisted audio settings
try {
  const s = JSON.parse(localStorage.getItem('nightfall.settings') || 'null');
  if (s && typeof s.vol === 'number') { S.vol = Math.min(1, Math.max(0, s.vol)); S.mute = !!s.mute; }
} catch { /* ignore corrupt settings */ }
const persistSettings = () => { try { localStorage.setItem('nightfall.settings', JSON.stringify({ vol: S.vol, mute: S.mute })); } catch {} };

let toastT;
export function toast(m, warn, ms = 3500) {
  const t = $('toast'); t.textContent = m; t.style.color = warn ? '#ff6b60' : '#aee'; t.style.opacity = 1;
  clearTimeout(toastT); toastT = setTimeout(() => (t.style.opacity = 0), ms);
}
export function setPrompt(txt) {
  const p = $('prompt');
  if (txt) { p.textContent = txt; p.classList.remove('hide'); } else p.classList.add('hide');
}
export const showHud = v => $('hud').classList.toggle('hide', !v);
export const showPause = v => $('pause').classList.toggle('hide', !v);
export const toggleInv = () => $('inv').classList.toggle('hide');

export function updateHud(aware, chase, T) {
  $('obj').innerHTML = '<b>OBJECTIVE</b><br>' + (S.obj < OBJ.length ? '▸ ' + OBJ[S.obj] : 'Escape');
  $('bBat').style.width = S.bat + '%';
  $('bBat').style.background = S.bat < 20 ? '#ff3b30' : '';
  $('bSt').style.width = S.stam + '%';
  const w = aware > 0.3 || chase;
  $('warn').classList.toggle('hide', !w);
  $('vig').style.opacity = chase ? 0.35 + 0.2 * Math.sin(T * 8) : aware * 0.25;
  if (!$('inv').classList.contains('hide'))
    $('inv').innerHTML = '<b>INVENTORY</b><br>' + (S.inv.length
      ? S.inv.map(i => `▸ ${i.name}<br><small>${i.desc}</small>`).join('<br>') : '<small>Empty</small>');
}

export function renderScores(list, mine, target = 'scores') {
  $(target).innerHTML = list.length
    ? '<b>FASTEST ESCAPES</b>' + list.map((s, i) =>
        `<div class="${mine && s.id === mine ? 'me' : ''}"><span>${i + 1}. ${esc(s.name)}</span><span>${fmt(s.time)}</span></div>`).join('')
    : '<small>No recorded escapes yet.</small>';
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function showEnd({ title, body, color = '', win = false }) {
  showHud(false);
  $('eT').textContent = title; $('eT').style.color = color; $('eB').textContent = body;
  $('nameRow').classList.toggle('hide', !win); $('scores').innerHTML = '';
  $('end').classList.remove('hide');
}

function settingsHTML() {
  return `<label>VOLUME <input class="vol" type="range" min="0" max="1" step=".05" value="${S.vol}"></label> <button class="mute">MUTE: ${S.mute ? 'ON' : 'OFF'}</button>`;
}
function bindSettings() {
  document.querySelectorAll('.vol').forEach(e => { e.value = S.vol; e.oninput = () => { S.vol = +e.value; setVolume(); persistSettings(); }; });
  document.querySelectorAll('.mute').forEach(b => {
    b.textContent = 'MUTE: ' + (S.mute ? 'ON' : 'OFF');
    b.onclick = () => {
      S.mute = !S.mute; setVolume(); persistSettings();
      document.querySelectorAll('.mute').forEach(x => (x.textContent = 'MUTE: ' + (S.mute ? 'ON' : 'OFF')));
    };
  });
}

export function initUI(cb) {
  const info = $('info');
  $('start').onclick = cb.onStart;
  $('cont').onclick = cb.onContinue;
  $('resume').onclick = cb.onResume;
  $('savebtn').onclick = cb.onSave;
  $('restart').onclick = cb.onMenu;
  $('submit').onclick = cb.onSubmit;
  $('setb').onclick = () => { info.classList.toggle('hide'); info.innerHTML = settingsHTML(); bindSettings(); };
  $('credb').onclick = () => {
    info.classList.toggle('hide');
    info.innerHTML = '<small>Original design, procedural art and synthesized audio. Built with Three.js, Vite and a small Node backend.</small>';
  };
  $('lbb').onclick = async () => {
    info.classList.remove('hide'); info.innerHTML = '<div id="lbscores" style="text-align:left;min-width:260px"></div>';
    renderScores(await cb.getScores(), null, 'lbscores');
  };
  bindSettings();
}
export const showContinue = v => $('cont').classList.toggle('hide', !v);
export const setNet = txt => ($('net').textContent = txt);
