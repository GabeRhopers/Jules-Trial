// On-screen touch controls. They feed a "virtual pad" that the player reads alongside the keyboard.
const PREF_KEY = 'song-of-zink.touch';

export const virtual = { enabled: false, held: {}, pressed: {}, released: {} };

export const vHeld = (a) => !!virtual.held[a];

// "Just pressed" / "just released": true once, then cleared (like Phaser's JustDown).
export function vPressed(a) {
  if (!virtual.pressed[a]) return false;
  virtual.pressed[a] = false;
  return true;
}
export function vReleased(a) {
  if (!virtual.released[a]) return false;
  virtual.released[a] = false;
  return true;
}
export function clearVirtualPresses() {
  virtual.pressed = {};
  virtual.released = {};
}

function press(a) {
  if (!virtual.held[a]) virtual.pressed[a] = true;
  virtual.held[a] = true;
}
function release(a) {
  if (virtual.held[a]) virtual.released[a] = true;
  virtual.held[a] = false;
}

const KEY_NAMES = {
  keyboard: { jump: 'Z', attack: 'X', dash: 'C', hook: 'A', bomb: 'S', heal: 'D', up: 'UP' },
  touch: { jump: 'JUMP', attack: 'ATK', dash: 'DASH', hook: 'HOOK', bomb: 'BOMB', heal: 'HEAL', up: '▲' },
};
export function keyName(action) {
  return KEY_NAMES[virtual.enabled ? 'touch' : 'keyboard'][action];
}

const BUTTONS = [
  { action: 'jump', label: 'JUMP', cls: 'big' },
  { action: 'attack', label: 'ATK', cls: '' },
  { action: 'dash', label: 'DASH', cls: '' },
  { action: 'hook', label: 'HOOK', cls: 'small', needs: 'hasHook' },
  { action: 'bomb', label: 'BOMB', cls: 'small', needs: 'hasBombs' },
  { action: 'heal', label: 'HEAL', cls: 'small' },
];

function prefersTouch() {
  try {
    const saved = localStorage.getItem(PREF_KEY);
    if (saved === 'on') return true;
    if (saved === 'off') return false;
  } catch (e) { /* storage blocked */ }
  return window.matchMedia('(pointer: coarse)').matches;
}

function savePref(on) {
  try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch (e) { /* storage blocked */ }
}

// Builds the d-pad and buttons inside the game frame. Returns a setter for on/off.
export function setupTouch(frame, getState) {
  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div class="dpad" id="dpad" aria-label="Movement pad">
      <span class="arrow up">▲</span><span class="arrow left">◀</span><span class="arrow right">▶</span><span class="arrow down">▼</span>
      <span class="knob"></span>
    </div>
    <div class="actions">
      ${BUTTONS.map((b) => `<button type="button" class="tbtn ${b.cls} a-${b.action}" data-action="${b.action}" ${b.needs ? `data-needs="${b.needs}"` : ''}>${b.label}</button>`).join('')}
    </div>`;
  frame.appendChild(root);

  // D-pad: one finger anywhere on the pad steers in 8 directions.
  const dpad = root.querySelector('#dpad');
  const knob = root.querySelector('.knob');
  let padPointer = null;
  const setDir = (dx, dy) => {
    const dead = 0.28;
    const set = (a, on) => (on ? press(a) : release(a));
    set('left', dx < -dead);
    set('right', dx > dead);
    set('up', dy < -0.5);
    set('down', dy > 0.5);
    knob.style.transform = `translate(${dx * 28}px, ${dy * 28}px)`;
  };
  const padMove = (e) => {
    const r = dpad.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
    const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    setDir(dx, dy);
  };
  dpad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    padPointer = e.pointerId;
    try { dpad.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
    padMove(e);
  });
  dpad.addEventListener('pointermove', (e) => { if (e.pointerId === padPointer) padMove(e); });
  const padEnd = (e) => { if (e.pointerId === padPointer) { padPointer = null; setDir(0, 0); } };
  dpad.addEventListener('pointerup', padEnd);
  dpad.addEventListener('pointercancel', padEnd);

  // Action buttons: hold-able, multi-touch.
  for (const btn of root.querySelectorAll('.tbtn')) {
    const a = btn.dataset.action;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
      btn.classList.add('down');
      press(a);
    });
    const end = () => { btn.classList.remove('down'); release(a); };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('lostpointercapture', end);
  }
  root.addEventListener('contextmenu', (e) => e.preventDefault());

  // Item buttons appear once the item is found.
  setInterval(() => {
    const s = getState();
    if (!s) return;
    for (const btn of root.querySelectorAll('[data-needs]')) btn.hidden = !s[btn.dataset.needs];
  }, 400);

  const setEnabled = (on, remember) => {
    virtual.enabled = on;
    document.body.classList.toggle('touch', on);
    root.hidden = !on;
    if (!on) { virtual.held = {}; clearVirtualPresses(); }
    if (remember) savePref(on);
  };
  setEnabled(prefersTouch(), false);
  return setEnabled;
}
