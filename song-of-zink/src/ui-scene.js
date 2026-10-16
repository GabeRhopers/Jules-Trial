import * as Phaser from 'phaser';
import { CONFIG } from './config.js';
import { state } from './save.js';
import { WORLD, linkTarget, ROOMS } from './world.js';
import { doorRects } from './rooms.js';
import { virtual, keyName } from './touch.js';

const FONT = '"Pixelify Sans", monospace';
const MAX_HEARTS_SHOWN = 10;

export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    const W = CONFIG.view.width;

    this.hearts = [];
    for (let i = 0; i < MAX_HEARTS_SHOWN; i++) this.hearts.push(this.add.image(28 + i * 22, 26, 'heart_full').setScale(2));
    this.notes = [];
    for (let i = 0; i < CONFIG.song.max; i++) this.notes.push(this.add.image(26 + i * 14, 52, 'note_full').setScale(2));
    this.add.text(26 + CONFIG.song.max * 14 + 4, 44, 'SONG', { fontFamily: FONT, fontSize: '12px', color: '#9a9cb8' });

    this.itemIcons = [
      { flag: 'hasHook', key: 'item_hook', label: 'A' },
      { flag: 'hasBombs', key: 'item_bomb', label: 'S' },
      { flag: 'hasKey', key: 'item_key', label: '' },
    ].map((it, i) => ({
      ...it,
      img: this.add.image(30 + i * 38, 84, it.key).setScale(2),
      txt: this.add.text(40 + i * 38, 88, it.label, { fontFamily: FONT, fontSize: '12px', color: '#f0c75e' }),
    }));

    this.map = this.add.graphics();
    this.mapLabel = this.add.text(W - 20, 14, '', { fontFamily: FONT, fontSize: '13px', color: '#9a9cb8' }).setOrigin(1, 0);

    this.toastText = this.add.text(24, CONFIG.view.height - 34, '', { fontFamily: FONT, fontSize: '16px', color: '#e8e6f2' }).setAlpha(0);
    this.prompt = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: '#f0c75e' }).setOrigin(0.5).setVisible(false);

    this.bannerBox = this.add.rectangle(W / 2, 128, 620, 74, 0x0b0d1a, 0.82).setStrokeStyle(1, 0xf0c75e, 0.6).setAlpha(0);
    this.bannerTitle = this.add.text(W / 2, 108, '', { fontFamily: FONT, fontSize: '24px', color: '#f0c75e' }).setOrigin(0.5).setAlpha(0);
    this.bannerText = this.add.text(W / 2, 142, '', { fontFamily: FONT, fontSize: '15px', color: '#e8e6f2', align: 'center', wordWrap: { width: 580 } }).setOrigin(0.5).setAlpha(0);

    this.bossBar = this.add.graphics().setVisible(false);
    this.bossName = this.add.text(W / 2, CONFIG.view.height - 54, 'WARDEN OF THE BELL', { fontFamily: FONT, fontSize: '14px', color: '#e8e6f2' }).setOrigin(0.5).setVisible(false);

    this.victory = this.add.container(0, 0).setVisible(false);
    const shade = this.add.rectangle(W / 2, CONFIG.view.height / 2, W, CONFIG.view.height, 0x0b0d1a, 0.86);
    const t1 = this.add.text(W / 2, 200, 'THE SONG IS RESTORED', { fontFamily: FONT, fontSize: '40px', color: '#f0c75e' }).setOrigin(0.5);
    this.victoryStats = this.add.text(W / 2, 264, '', { fontFamily: FONT, fontSize: '18px', color: '#e8e6f2', align: 'center' }).setOrigin(0.5);
    const t3 = this.add.text(W / 2, 330, 'Tap or press ENTER to keep exploring', { fontFamily: FONT, fontSize: '16px', color: '#9a9cb8' }).setOrigin(0.5);
    this.victory.add([shade, t1, this.victoryStats, t3]);
    this.enterKey = this.input.keyboard.addKey('ENTER');

    this.game.events.on('room-enter', (name) => this.toast(name), this);
    this.input.on('pointerdown', () => { if (this.victory.visible) this.victory.setVisible(false); });
  }

  banner(title, text, ms = 3600) {
    const targets = [this.bannerBox, this.bannerTitle, this.bannerText];
    this.tweens.killTweensOf(targets);
    this.bannerTitle.setText(title);
    this.bannerText.setText(text || '');
    targets.forEach((t) => t.setAlpha(1));
    this.tweens.add({ targets, alpha: 0, delay: ms, duration: 400 });
  }

  toast(text) {
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2000, duration: 500 });
  }

  showBoss(boss) { this.bossRef = boss; this.bossBar.setVisible(true); this.bossName.setVisible(true); }
  hideBoss() { this.bossRef = null; this.bossBar.setVisible(false); this.bossName.setVisible(false); }

  showVictory() {
    const s = Math.floor(state.playTimeMs / 1000);
    const hearts = state.maxHearts > CONFIG.player.startHearts ? 'Heart vessel found' : 'Heart vessel not found';
    this.victoryStats.setText(`Time ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}\n${hearts}`);
    this.victory.setVisible(true);
  }

  update() {
    const game = this.scene.get('Game');

    this.hearts.forEach((h, i) => {
      h.setVisible(i < state.maxHearts);
      h.setTexture(i < state.hearts ? 'heart_full' : 'heart_empty');
    });
    this.notes.forEach((n, i) => {
      n.setTexture(i < state.song ? 'note_full' : 'note_empty');
      n.setAlpha(i < state.song && state.song >= CONFIG.song.healCost ? 1 : 0.8);
    });
    for (const it of this.itemIcons) { it.img.setVisible(!!state[it.flag]); it.txt.setVisible(!!state[it.flag] && !virtual.enabled); }

    if (this.bossRef) {
      const b = this.bossRef;
      const W = CONFIG.view.width;
      const w = 420;
      this.bossBar.clear();
      this.bossBar.fillStyle(0x1c1f30, 1).fillRect(W / 2 - w / 2, CONFIG.view.height - 40, w, 12);
      this.bossBar.fillStyle(b.armored ? 0x9aa3b5 : 0xe0524a, 1).fillRect(W / 2 - w / 2, CONFIG.view.height - 40, w * (b.hp / b.maxHp), 12);
      this.bossBar.lineStyle(1, 0xf0c75e, 0.7).strokeRect(W / 2 - w / 2, CONFIG.view.height - 40, w, 12);
    }

    if (game && game.player && game.nearBench && !game.player.dead) {
      const cam = game.cameras.main;
      const x = (game.nearBench.x - cam.worldView.x) * cam.zoom;
      const y = (game.nearBench.y - 26 - cam.worldView.y) * cam.zoom;
      this.prompt.setText(`${keyName('up')}  rest`).setPosition(x, y).setVisible(true);
    } else this.prompt.setVisible(false);

    this.drawMinimap(game);

    if (this.victory.visible && Phaser.Input.Keyboard.JustDown(this.enterKey)) this.victory.setVisible(false);
  }

  drawMinimap(game) {
    const g = this.map;
    g.clear();
    const unit = 22;
    const rooms = WORLD.rooms;
    const ids = Object.keys(rooms);
    const maxX = Math.max(...ids.map((id) => rooms[id].map[0] + rooms[id].map[2]));
    const ox = CONFIG.view.width - 20 - maxX * unit;
    const oy = 36;
    const rect = (id) => {
      const [x, y, w, h] = rooms[id].map;
      return { x: ox + x * unit, y: oy + y * unit, w: w * unit - 3, h: h * unit - 3 };
    };
    const visited = new Set(state.visited);
    g.lineStyle(2, 0x3a3f5c, 1);
    for (const id of visited) {
      if (!ROOMS[id]) continue;
      for (const digit of Object.keys(doorRects(ROOMS[id]))) {
        const t = linkTarget(id, digit);
        if (t && visited.has(t.room)) {
          const a = rect(id);
          const b = rect(t.room);
          g.lineBetween(a.x + a.w / 2, a.y + a.h / 2, b.x + b.w / 2, b.y + b.h / 2);
        }
      }
    }
    for (const id of visited) {
      if (!rooms[id]) continue;
      const r = rect(id);
      const current = game && game.roomId === id;
      g.fillStyle(current ? 0x3fae5a : 0x2b2f45, 1).fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(1, current ? 0xf0c75e : 0x5d6386, 1).strokeRect(r.x, r.y, r.w, r.h);
      if (ROOMS[id] && ROOMS[id].rows.some((row) => row.includes('S'))) g.fillStyle(0xf0c75e, 1).fillRect(r.x + 3, r.y + 3, 4, 4);
      if (ROOMS[id] && ROOMS[id].rows.some((row) => row.includes('W')) && !state.bossDefeated) g.fillStyle(0xe0524a, 1).fillRect(r.x + r.w - 7, r.y + 3, 4, 4);
    }
    this.mapLabel.setText(game && game.roomId ? rooms[game.roomId].name : '');
    this.mapLabel.setY(oy + Math.max(...ids.map((id) => rooms[id].map[1] + rooms[id].map[3])) * unit + 4);
  }
}
