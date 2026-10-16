import * as Phaser from 'phaser';
import { CONFIG } from './config.js';
import { state, resetState } from './save.js';
import { WORLD, WORLD_ERRORS } from './world.js';
import { BootScene } from './boot-scene.js';
import { GameScene } from './game-scene.js';
import { UIScene } from './ui-scene.js';
import { setupTouch } from './touch.js';
import { onPadActive } from './input.js';

function start() {
  if (WORLD_ERRORS.length) {
    const box = document.getElementById('world-errors');
    if (box) { box.hidden = false; box.textContent = `Room problems:\n${WORLD_ERRORS.join('\n')}`; }
    return;
  }
  // Touch controls first: they change the page layout the game scales into.
  const setTouch = setupTouch(document.getElementById('game-frame'), () => state);
  const hint = document.getElementById('focus-hint');
  if (hint && document.body.classList.contains('touch')) hint.textContent = 'Tap to play';

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-frame',
    width: CONFIG.view.width,
    height: CONFIG.view.height,
    backgroundColor: '#0b0d1a',
    pixelArt: true,
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: CONFIG.player.gravity }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, GameScene, UIScene],
  });

  const gameScene = () => game.scene.getScene('Game');

  // Small API used by the page buttons and the automated tests.
  window.__zink = {
    game,
    state,
    get scene() { return gameScene(); },
    get ready() { const s = gameScene(); return !!(s && s.player && !s.transitioning); },
    newGame() {
      resetState();
      const ui = game.scene.getScene('UI');
      if (ui) { ui.hideBoss(); ui.victory.setVisible(false); }
      gameScene().scene.restart({ room: WORLD.start });
    },
    warp(room, door) { gameScene().scene.restart({ room, door }); },
    give(flag) { state[flag] = true; },
  };

  const touchToggle = document.getElementById('touch-toggle');
  if (touchToggle) {
    const sync = () => { touchToggle.textContent = document.body.classList.contains('touch') ? 'Hide touch buttons' : 'Show touch buttons'; };
    sync();
    touchToggle.addEventListener('click', () => { setTouch(!document.body.classList.contains('touch'), true); sync(); touchToggle.blur(); requestAnimationFrame(() => game.scale.refresh()); });
  }

  // A controller takes over: hide touch buttons (without changing the saved preference).
  onPadActive(() => {
    if (document.body.classList.contains('touch')) { setTouch(false, false); requestAnimationFrame(() => game.scale.refresh()); }
    const hintEl = document.getElementById('focus-hint');
    if (hintEl) hintEl.hidden = true;
    const ui = game.scene.getScene('UI');
    if (ui && ui.toast) ui.toast('Controller connected');
    if (touchToggle) touchToggle.textContent = 'Show touch buttons';
  });

  const newGameBtn = document.getElementById('new-game');
  if (newGameBtn) newGameBtn.addEventListener('click', () => { window.__zink.newGame(); newGameBtn.blur(); });
}

const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(start, start);
