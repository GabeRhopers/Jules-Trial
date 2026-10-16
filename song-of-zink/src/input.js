// Shared "virtual" input fed by touch buttons and game controllers. The player reads it
// alongside the keyboard. Each source keeps its own held/pressed/released maps.
const sources = { touch: makeSource(), pad: makeSource() };
function makeSource() { return { held: {}, pressed: {}, released: {} }; }

export const inputInfo = { lastDevice: 'keyboard', touchEnabled: false, padConnected: false };

export function press(source, a) {
  const s = sources[source];
  if (!s.held[a]) s.pressed[a] = true;
  s.held[a] = true;
}
export function release(source, a) {
  const s = sources[source];
  if (s.held[a]) s.released[a] = true;
  s.held[a] = false;
}
export function clearSource(source) { sources[source] = makeSource(); }

export const vHeld = (a) => Object.values(sources).some((s) => s.held[a]);

// True once per press (like Phaser's JustDown). Reads and clears every source.
export function vPressed(a) {
  let hit = false;
  for (const s of Object.values(sources)) if (s.pressed[a]) { s.pressed[a] = false; hit = true; }
  return hit;
}
export function vReleased(a) {
  let hit = false;
  for (const s of Object.values(sources)) if (s.released[a]) { s.released[a] = false; hit = true; }
  return hit;
}
export function clearVirtualPresses() {
  for (const s of Object.values(sources)) { s.pressed = {}; s.released = {}; }
}

// ---------- Button names shown in hints and banners ----------

const KEY_NAMES = {
  keyboard: { jump: 'Z', attack: 'X', dash: 'C', hook: 'A', bomb: 'S', heal: 'D', up: 'UP' },
  touch: { jump: 'JUMP', attack: 'ATK', dash: 'DASH', hook: 'HOOK', bomb: 'BOMB', heal: 'HEAL', up: '▲' },
  pad: { jump: 'A', attack: 'X', dash: 'B', hook: 'Y', bomb: 'RB', heal: 'LB', up: '▲' },
};
export function inputMode() {
  if (inputInfo.lastDevice === 'pad') return 'pad';
  return inputInfo.touchEnabled ? 'touch' : 'keyboard';
}
export const keyName = (action) => KEY_NAMES[inputMode()][action];

// ---------- Game controllers (standard mapping) ----------
// Buttons: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 9 Start, 12-15 d-pad up/down/left/right.
const PAD_BUTTONS = {
  jump: [0],
  dash: [1, 7],
  attack: [2],
  hook: [3],
  bomb: [5],
  heal: [4, 6],
  start: [9],
  up: [12],
  down: [13],
  left: [14],
  right: [15],
};
const STICK_DEAD = 0.45;

const isDown = (b) => !!b && (b.pressed || b.value > 0.5);

export function pollGamepads() {
  let pads = [];
  try { pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : []; } catch (e) { pads = []; }
  inputInfo.padConnected = pads.length > 0;
  const want = {};
  for (const pad of pads) {
    for (const [action, idxs] of Object.entries(PAD_BUTTONS)) if (idxs.some((i) => isDown(pad.buttons[i]))) want[action] = true;
    const x = pad.axes[0] || 0;
    const y = pad.axes[1] || 0;
    if (x < -STICK_DEAD) want.left = true;
    if (x > STICK_DEAD) want.right = true;
    if (y < -0.6) want.up = true;
    if (y > 0.6) want.down = true;
  }
  let any = false;
  for (const action of Object.keys(PAD_BUTTONS)) {
    if (want[action]) { press('pad', action); any = true; } else release('pad', action);
  }
  if (any && inputInfo.lastDevice !== 'pad') {
    inputInfo.lastDevice = 'pad';
    for (const fn of padListeners) fn();
  }
}

const padListeners = [];
export function onPadActive(fn) { padListeners.push(fn); }

// Any key press switches hints back to keyboard names.
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', () => { inputInfo.lastDevice = 'keyboard'; }, true);
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') inputInfo.lastDevice = 'touch'; }, true);
}
