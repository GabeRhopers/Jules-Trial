import * as Phaser from 'phaser';

// All art is drawn here in code. To use real sprites later, load images with the same keys.
export const PALETTE = {
  night: 0x0b0d1a,
  stone: 0x2b2f45,
  stoneLight: 0x3a3f5c,
  stoneDark: 0x1c1f30,
  moss: 0x5b8c5a,
  hood: 0x3fae5a,
  hoodDark: 0x2a7a3e,
  mask: 0xf2efe6,
  cloak: 0xc8443a,
  cloakDark: 0x8f2a24,
  boot: 0x5a3b2a,
  gold: 0xf0c75e,
  bronze: 0x9c7a3c,
  bronzeDark: 0x6b5226,
  violet: 0x7b5ea7,
  teal: 0x5ec4b6,
  white: 0xffffff,
  red: 0xe0524a,
  steel: 0xd8dbe8,
};

function tex(scene, key, w, h, draw) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}
const r = (g, color, x, y, w = 1, h = 1) => { g.fillStyle(color, 1); g.fillRect(x, y, w, h); };

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const P = PALETTE;

    // Stone tiles: 3 variants, plus a mossy top edge variant of each.
    for (let v = 0; v < 3; v++) {
      for (const top of [false, true]) {
        tex(this, `tile${v}${top ? 't' : ''}`, 16, 16, (g) => {
          r(g, P.stone, 0, 0, 16, 16);
          r(g, P.stoneDark, 0, 15, 16, 1); r(g, P.stoneDark, 15, 0, 1, 16);
          r(g, P.stoneLight, 0, 0, 16, 1); r(g, P.stoneLight, 0, 0, 1, 16);
          const specks = [[3, 5], [10, 9], [6, 12], [12, 3], [8, 7]];
          specks.forEach(([x, y], i) => { if ((i + v) % 2 === 0) r(g, P.stoneDark, x, y, 2, 1); });
          if (v === 1) { r(g, P.stoneDark, 2, 8, 6, 1); r(g, P.stoneDark, 8, 8, 1, 4); }
          if (top) { r(g, P.moss, 0, 0, 16, 3); r(g, 0x7fb06f, 2, 0, 3, 1); r(g, 0x7fb06f, 9, 0, 4, 1); r(g, P.moss, 4, 3, 2, 1); r(g, P.moss, 12, 3, 1, 2); }
        });
      }
    }
    tex(this, 'cracked', 16, 16, (g) => {
      r(g, 0x4a4f6a, 0, 0, 16, 16);
      r(g, 0x5d6386, 0, 0, 16, 1);
      g.lineStyle(1, 0x15172a, 1);
      g.beginPath(); g.moveTo(3, 0); g.lineTo(7, 6); g.lineTo(5, 10); g.lineTo(9, 16); g.strokePath();
      g.beginPath(); g.moveTo(7, 6); g.lineTo(13, 8); g.lineTo(16, 7); g.strokePath();
      g.beginPath(); g.moveTo(5, 10); g.lineTo(0, 12); g.strokePath();
    });
    tex(this, 'gate', 16, 16, (g) => {
      r(g, 0x1c1f30, 0, 0, 16, 16);
      for (const x of [2, 7, 12]) { r(g, 0x8a8fa8, x, 0, 2, 16); r(g, 0xb9bdd2, x, 0, 1, 16); }
      r(g, 0x8a8fa8, 0, 5, 16, 2);
    });
    tex(this, 'bossdoor', 16, 16, (g) => {
      r(g, 0x5a2a24, 0, 0, 16, 16); r(g, 0x3c1a17, 0, 0, 1, 16); r(g, 0x3c1a17, 15, 0, 1, 16);
      r(g, P.gold, 0, 6, 16, 2); r(g, P.gold, 6, 3, 4, 8); r(g, 0x3c1a17, 7, 6, 2, 3);
    });
    tex(this, 'spikes', 16, 16, (g) => {
      g.fillStyle(P.steel, 1);
      for (let x = 0; x < 16; x += 4) g.fillTriangle(x, 16, x + 2, 5, x + 4, 16);
      g.fillStyle(0x9aa0b8, 1);
      for (let x = 0; x < 16; x += 4) g.fillTriangle(x + 2, 16, x + 2, 5, x + 4, 16);
      r(g, P.red, 0, 15, 16, 1);
    });
    tex(this, 'anchor', 14, 14, (g) => {
      g.fillStyle(P.gold, 0.25); g.fillCircle(7, 7, 7);
      g.lineStyle(2, P.gold, 1); g.strokeCircle(7, 7, 4);
      r(g, 0xfff3c4, 6, 2, 2, 1);
    });
    tex(this, 'bench', 24, 12, (g) => {
      r(g, 0x8b5a3c, 1, 3, 22, 3); r(g, 0xb07a52, 1, 3, 22, 1);
      r(g, 0x5a3b2a, 3, 6, 2, 6); r(g, 0x5a3b2a, 19, 6, 2, 6);
      r(g, 0x8b5a3c, 2, 0, 2, 3); r(g, 0x8b5a3c, 20, 0, 2, 3);
    });
    tex(this, 'lever_off', 10, 14, (g) => {
      r(g, 0x5d6386, 1, 10, 8, 4);
      g.lineStyle(2, 0xb9bdd2, 1); g.beginPath(); g.moveTo(5, 11); g.lineTo(1, 3); g.strokePath();
      r(g, P.red, 0, 1, 3, 3);
    });
    tex(this, 'lever_on', 10, 14, (g) => {
      r(g, 0x5d6386, 1, 10, 8, 4);
      g.lineStyle(2, 0xb9bdd2, 1); g.beginPath(); g.moveTo(5, 11); g.lineTo(9, 3); g.strokePath();
      r(g, P.hood, 7, 1, 3, 3);
    });

    // Zink: green hood, white mask, red cloak. Faces right.
    tex(this, 'zink', 16, 24, (g) => {
      r(g, P.hoodDark, 1, 5, 2, 3); r(g, P.hoodDark, 2, 3, 3, 3);
      r(g, P.hood, 4, 1, 8, 8); r(g, P.hood, 3, 3, 2, 4); r(g, P.hood, 6, 0, 4, 1);
      r(g, P.mask, 7, 4, 5, 5); r(g, 0x1b1d2c, 9, 5, 1, 2); r(g, 0x1b1d2c, 11, 5, 1, 2);
      r(g, P.cloak, 4, 9, 9, 8); r(g, P.cloakDark, 4, 9, 2, 8); r(g, P.cloak, 3, 14, 11, 4);
      r(g, P.cloakDark, 3, 17, 11, 1);
      r(g, P.steel, 13, 8, 1, 9);
      r(g, P.boot, 5, 18, 2, 4); r(g, P.boot, 9, 18, 2, 4);
      r(g, 0x3a2519, 4, 22, 3, 2); r(g, 0x3a2519, 9, 22, 3, 2);
    });

    tex(this, 'crawler', 18, 12, (g) => {
      g.fillStyle(P.violet, 1); g.fillEllipse(9, 6, 16, 10);
      g.fillStyle(0x9d84c8, 1); g.fillEllipse(8, 4, 9, 4);
      r(g, 0x2c2140, 2, 10, 2, 2); r(g, 0x2c2140, 8, 10, 2, 2); r(g, 0x2c2140, 14, 10, 2, 2);
      r(g, P.gold, 14, 5, 2, 2);
    });
    tex(this, 'flyer', 16, 12, (g) => {
      g.fillStyle(P.teal, 0.85); g.fillEllipse(4, 5, 8, 9); g.fillEllipse(12, 5, 8, 9);
      g.fillStyle(0x24394a, 1); g.fillEllipse(8, 7, 5, 9);
      r(g, P.gold, 7, 5, 1, 1); r(g, P.gold, 9, 5, 1, 1);
    });
    tex(this, 'warden', 36, 44, (g) => {
      g.fillStyle(P.bronze, 1); g.fillRoundedRect(5, 3, 26, 30, 10);
      r(g, P.bronze, 1, 28, 34, 7); r(g, P.bronzeDark, 1, 34, 34, 2);
      r(g, 0xc9a05a, 9, 6, 6, 2); r(g, 0xc9a05a, 7, 9, 2, 10);
      r(g, P.bronzeDark, 16, 0, 4, 4);
      r(g, 0x1b1d2c, 11, 14, 14, 8); r(g, P.gold, 14, 16, 8, 4); r(g, 0xfff3c4, 17, 17, 2, 2);
      r(g, P.bronzeDark, 8, 36, 7, 8); r(g, P.bronzeDark, 21, 36, 7, 8);
    });
    tex(this, 'bell', 12, 12, (g) => {
      g.fillStyle(P.bronze, 1); g.fillRoundedRect(2, 1, 8, 8, 3);
      r(g, P.bronze, 0, 7, 12, 3); r(g, P.bronzeDark, 5, 10, 2, 2); r(g, 0xc9a05a, 3, 2, 2, 4);
    });
    tex(this, 'shock', 12, 10, (g) => {
      g.fillStyle(0xff9a3c, 1); g.fillTriangle(0, 10, 6, 0, 12, 10);
      g.fillStyle(0xffd166, 1); g.fillTriangle(3, 10, 6, 4, 9, 10);
    });
    tex(this, 'bomb', 10, 10, (g) => {
      g.fillStyle(0x23305e, 1); g.fillCircle(5, 6, 4); r(g, 0x5a6bb0, 3, 4, 2, 1);
      r(g, P.gold, 5, 0, 1, 2); r(g, 0xff9a3c, 6, 0, 1, 1);
    });
    tex(this, 'spark', 4, 4, (g) => r(g, P.white, 0, 0, 4, 4));

    // Items (14x14) with a soft glow.
    const item = (key, draw) => tex(this, key, 14, 14, (g) => { g.fillStyle(P.gold, 0.18); g.fillCircle(7, 7, 7); draw(g); });
    item('item_hook', (g) => {
      g.lineStyle(2, 0xb9bdd2, 1); g.beginPath(); g.moveTo(3, 11); g.lineTo(9, 5); g.strokePath();
      g.lineStyle(2, P.gold, 1); g.beginPath(); g.arc(9, 6, 3, -2.5, 1.2); g.strokePath();
    });
    item('item_bomb', (g) => { g.fillStyle(0x23305e, 1); g.fillCircle(7, 8, 4); r(g, 0x5a6bb0, 5, 6, 2, 1); r(g, P.gold, 7, 2, 1, 3); r(g, 0xff9a3c, 8, 1, 1, 1); });
    item('item_heart', (g) => { g.fillStyle(0xff7aa2, 1); g.fillCircle(5, 6, 3); g.fillCircle(9, 6, 3); g.fillTriangle(2, 7, 12, 7, 7, 12); });
    item('item_key', (g) => { g.lineStyle(2, P.gold, 1); g.strokeCircle(5, 5, 3); r(g, P.gold, 7, 6, 6, 2); r(g, P.gold, 11, 8, 2, 3); });

    // UI pieces.
    const heart = (key, fill) => tex(this, key, 9, 8, (g) => {
      const rows = ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'];
      rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') r(g, fill, x, y); }));
    });
    heart('heart_full', 0xff5d6c); heart('heart_empty', 0x3a3f5c);
    tex(this, 'note_full', 6, 8, (g) => { r(g, P.gold, 4, 0, 1, 6); r(g, P.gold, 1, 5, 4, 3); });
    tex(this, 'note_empty', 6, 8, (g) => { r(g, 0x3a3f5c, 4, 0, 1, 6); r(g, 0x3a3f5c, 1, 5, 4, 3); });
    tex(this, 'bgtile', 32, 32, (g) => {
      r(g, 0x10132a, 0, 0, 32, 32);
      r(g, 0x14183a, 0, 0, 15, 7); r(g, 0x14183a, 17, 8, 14, 7); r(g, 0x14183a, 3, 17, 13, 6); r(g, 0x14183a, 19, 24, 12, 7);
    });

    this.scene.start('Game', {});
    this.scene.launch('UI');
  }
}
