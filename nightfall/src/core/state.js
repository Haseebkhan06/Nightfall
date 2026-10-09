// Shared mutable game state. Kept in one place so modules stay decoupled.
export const OBJ = [
  'Find a flashlight',
  'Find a security access card',
  'Unlock the laboratory door',
  'Retrieve the emergency access key',
  'Reach the exit and escape'
];
export const NAMES = { card: 'Security Card', ekey: 'Emergency Key' };

export const S = {
  state: 'menu',            // menu | play | over | win
  paused: false,
  inv: [], obj: 0, picked: [], opened: [],
  vol: 0.6, mute: false,
  flash: false, hasFl: false, bat: 100,
  stam: 100, tired: false,
  hidden: false, crouch: false,
  yaw: -Math.PI / 2, pitch: 0, eye: 1.7, bob: 0, stepT: 0, noise: 0,
  labOpen: false, found: 0, time: 0, px: 0, pz: 0
};
export const P = { x: -8, z: 1 };
export const keys = {};

// Late-bound callbacks so modules don't import each other in cycles.
export const hooks = {
  noise: () => {}, unlockLab: () => {}, save: () => {}, over: () => {}, win: () => {}
};

export const has = id => S.inv.some(i => i.id === id);
export const adv = i => { if (S.obj === i) S.obj++; };
