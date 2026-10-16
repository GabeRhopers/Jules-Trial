import * as Phaser from 'phaser';
import { CONFIG, TILE } from './config.js';
import { state, saveState } from './save.js';
import { WORLD, ROOMS, linkTarget } from './world.js';
import { cellsOf, doorRects, SOLID_CHARS } from './rooms.js';
import { Player } from './player.js';
import { Crawler, Flyer } from './enemies.js';
import { Warden } from './boss.js';
import { keyName, clearVirtualPresses, pollGamepads, inputMode } from './input.js';

const ITEMS = {
  K: { key: 'item_hook', flag: 'hasHook', title: 'HOOKSHOT', text: () => `Press ${keyName('hook')} to pull yourself to glowing rings. With no ring nearby, the chain stuns enemies.` },
  O: { key: 'item_bomb', flag: 'hasBombs', title: 'BOMBS', text: () => `Press ${keyName('bomb')} to throw a bomb. Blasts break cracked walls.` },
  k: { key: 'item_key', flag: 'hasKey', title: 'VAULT KEY', text: 'It fits the sealed door in the Cracked Vault.' },
  '+': { key: 'item_heart', flag: null, title: 'HEART VESSEL', text: 'Your maximum health grows by one.' },
};

const cellId = (room, c, r) => `${room}:${c},${r}`;

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create(data = {}) {
    this.roomId = data.room || (state.bench ? state.bench.room : WORLD.start);
    this.room = ROOMS[this.roomId];
    if (!state.visited.includes(this.roomId)) state.visited.push(this.roomId);
    this.transitioning = false;
    this.barredNoticeAt = 0;
    clearVirtualPresses();

    const W = this.room.w * TILE;
    const H = this.room.h * TILE;
    this.physics.world.setBounds(0, 0, W, H);

    const cam = this.cameras.main;
    this.bg = this.add.tileSprite(0, 0, CONFIG.view.width, CONFIG.view.height, 'bgtile').setOrigin(0).setScrollFactor(0).setDepth(-10);

    this.buildRoom();

    // Spawn point: through a door, at a bench, or at the start marker.
    const doors = doorRects(this.room);
    let spawn;
    let facing = 1;
    if (data.door && doors[data.door]) {
      const d = doors[data.door];
      facing = d.edge === 'left' ? 1 : -1;
      spawn = { x: d.edge === 'left' ? 2 * TILE + 6 : (this.room.w - 2) * TILE - 6, y: (d.r1 + 1) * TILE - 12 };
    } else {
      const bench = cellsOf(this.room, 'S')[0];
      const start = cellsOf(this.room, 'P')[0];
      const at = (state.bench && bench) ? bench : (start || bench || { c: 2, r: 2 });
      spawn = { x: at.c * TILE + 8, y: (at.r + 1) * TILE - 12 };
    }
    this.player = new Player(this, spawn.x, spawn.y, facing);
    this.lastSafe = { ...spawn };

    this.physics.add.collider(this.player, this.solids, this.onPlayerTouchSolid, null, this);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.bombs, this.solids);
    this.physics.add.collider(this.hazards, this.solids, (h) => h.onSolid && h.onSolid());
    this.physics.add.overlap(this.player, this.enemies, (p, e) => { if (!e.harmless) p.hurt(1, e.x); });
    this.physics.add.overlap(this.player, this.hazards, (p, h) => p.hurt(1, h.x));
    if (this.boss) {
      this.physics.add.collider(this.boss, this.solids);
      this.physics.add.overlap(this.player, this.boss, (p, b) => { if (!b.harmless) p.hurt(1, b.x); });
    }

    cam.setZoom(CONFIG.view.zoom);
    cam.setBounds(0, 0, W, H);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    cam.fadeIn(160, 11, 13, 26);

    this.ui = this.scene.get('UI');
    this.game.events.emit('room-enter', WORLD.rooms[this.roomId].name);
    if (data.message) this.time.delayedCall(200, () => this.ui.banner(data.message.title, data.message.text));
  }

  // ---------- Room building ----------

  buildRoom() {
    const room = this.room;
    this.solidGrid = room.rows.map((row) => [...row].map((ch) => SOLID_CHARS.has(ch)));
    this.typeGrid = room.rows.map((row) => [...row].map((ch) => (SOLID_CHARS.has(ch) ? ch : null)));
    this.tileImages = {};
    this.solids = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.hazards = this.physics.add.group();
    this.bombs = this.physics.add.group();
    this.anchors = [];
    this.items = [];
    this.benches = [];
    this.levers = [];
    this.spikes = [];
    this.boss = null;
    this.activeBomb = null;

    const isSolidChar = (c, r) => r >= 0 && r < room.h && c >= 0 && c < room.w && SOLID_CHARS.has(room.rows[r][c]);
    const enemySpawns = [];

    room.rows.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        const x = c * TILE + 8;
        const y = r * TILE + 8;
        const id = cellId(this.roomId, c, r);
        switch (ch) {
          case '#': {
            const top = !isSolidChar(c, r - 1);
            const v = (c * 7 + r * 13) % 3;
            this.addTileImage(c, r, `tile${v}${top ? 't' : ''}`);
            break;
          }
          case 'B': case 'D': case 'G': {
            const gone = (ch === 'B' && state.broken.includes(id)) || (ch === 'D' && state.bossDoorOpen) || (ch === 'G' && state.gateOpen);
            if (gone) { this.solidGrid[r][c] = false; this.typeGrid[r][c] = null; }
            else this.addTileImage(c, r, { B: 'cracked', D: 'bossdoor', G: 'gate' }[ch]);
            break;
          }
          case '^':
            this.add.image(x, y, 'spikes').setDepth(2);
            this.spikes.push(new Phaser.Geom.Rectangle(c * TILE + 1, r * TILE + 6, TILE - 2, TILE - 6));
            break;
          case 'H':
            this.anchors.push(this.add.image(x, y, 'anchor').setDepth(3));
            break;
          case 'S':
            this.benches.push(this.add.image(x, (r + 1) * TILE - 6, 'bench').setDepth(3));
            break;
          case 'L':
            this.levers.push(this.add.image(x, (r + 1) * TILE - 7, state.gateOpen ? 'lever_on' : 'lever_off').setDepth(3));
            break;
          case 'K': case 'O': case 'k': case '+':
            if (!state.collected.includes(id)) {
              const img = this.add.image(x, y, ITEMS[ch].key).setDepth(4);
              img.setData({ ch, id });
              this.tweens.add({ targets: img, y: y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
              this.items.push(img);
            }
            break;
          case 'E': case 'F': case 'W':
            enemySpawns.push({ ch, c, r });
            break;
          default:
            break;
        }
      });
    });

    for (const type of SOLID_CHARS) this.buildSolidBodies(type);

    for (const { ch, c, r } of enemySpawns) {
      const x = c * TILE + 8;
      const bottom = (r + 1) * TILE;
      if (ch === 'E') { const e = new Crawler(this, x, bottom - 6); this.enemies.add(e); e.init(); }
      if (ch === 'F') { const e = new Flyer(this, x, bottom - 8); this.enemies.add(e); e.init(); }
      if (ch === 'W' && !state.bossDefeated) this.boss = new Warden(this, x, bottom - 22);
    }

    const hints = (WORLD.hints && WORLD.hints[this.roomId]) || [];
    for (const h of hints) {
      this.add.text(h.x * TILE, h.y * TILE, h[inputMode()] || h.text, {
        fontFamily: '"Pixelify Sans", monospace', fontSize: '8px', color: '#9a9cb8',
      }).setResolution(4).setDepth(1);
    }
  }

  addTileImage(c, r, key) {
    const img = this.add.image(c * TILE + 8, r * TILE + 8, key).setDepth(2);
    this.tileImages[`${c},${r}`] = img;
    return img;
  }

  // Merges same-type solid cells into large rectangles. One body per block avoids
  // the seams between single tiles that would snag the player on walls.
  buildSolidBodies(type) {
    const { w, h } = this.room;
    const used = this.typeGrid.map((row) => row.map(() => false));
    const match = (r, c) => this.typeGrid[r][c] === type && !used[r][c];
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (!match(r, c)) continue;
        let c1 = c;
        while (c1 + 1 < w && match(r, c1 + 1)) c1++;
        let r1 = r;
        grow: while (r1 + 1 < h) {
          for (let k = c; k <= c1; k++) if (!match(r1 + 1, k)) break grow;
          r1++;
        }
        const cells = [];
        for (let rr = r; rr <= r1; rr++) for (let cc = c; cc <= c1; cc++) { used[rr][cc] = true; cells.push([cc, rr]); }
        this.addSolidBlock(c, r, c1, r1, type, cells);
      }
    }
  }

  addSolidBlock(c0, r0, c1, r1, type, cells) {
    const wpx = (c1 - c0 + 1) * TILE;
    const hpx = (r1 - r0 + 1) * TILE;
    const zone = this.add.zone(c0 * TILE + wpx / 2, r0 * TILE + hpx / 2, wpx, hpx);
    this.physics.add.existing(zone, true);
    this.solids.add(zone);
    zone.setData({ type, cells });
    for (const [c, r] of cells) this.solidGrid[r][c] = true;
    return zone;
  }

  // Removes a merged block, its tile images and its cells from the solid grid.
  removeSolid(block, color) {
    for (const [c, r] of block.getData('cells')) {
      this.solidGrid[r][c] = false;
      this.typeGrid[r][c] = null;
      const img = this.tileImages[`${c},${r}`];
      if (img) {
        if (color !== undefined) this.puff(img.x, img.y, color);
        img.destroy();
        delete this.tileImages[`${c},${r}`];
      }
    }
    block.destroy();
  }

  isSolidAt(px, py) {
    const c = Math.floor(px / TILE);
    const r = Math.floor(py / TILE);
    if (r < 0 || c < 0 || r >= this.room.h || c >= this.room.w) return false;
    return this.solidGrid[r][c];
  }

  // ---------- Main loop ----------

  update(time, delta) {
    pollGamepads();
    if (this.transitioning) return;
    state.playTimeMs += delta;
    const p = this.player;
    p.update(time, delta);
    if (this.boss) this.boss.update(time, delta);
    this.bg.tilePositionX = this.cameras.main.scrollX * 0.35;
    this.bg.tilePositionY = this.cameras.main.scrollY * 0.35;
    if (p.dead) return;

    const pb = p.body;
    const pRect = new Phaser.Geom.Rectangle(pb.x, pb.y, pb.width, pb.height);

    // Spikes: take damage and return to the last safe spot.
    if (this.spikes.some((s) => Phaser.Geom.Intersects.RectangleToRectangle(pRect, s))) {
      p.hurt(1, p.x, { noKnockback: true });
      if (!p.dead) {
        p.teleport(this.lastSafe.x, this.lastSafe.y);
        p.invulnUntil = Math.max(p.invulnUntil, time + 600);
        this.cameras.main.flash(120, 224, 82, 74);
      }
      return;
    }
    if (p.onGround && p.mode === 'normal') this.lastSafe = { x: p.x, y: p.y };

    // Doors.
    for (const [digit, d] of Object.entries(doorRects(this.room))) {
      const rect = new Phaser.Geom.Rectangle(d.c0 * TILE, d.r0 * TILE, (d.c1 - d.c0 + 1) * TILE, (d.r1 - d.r0 + 1) * TILE);
      if (Phaser.Geom.Intersects.RectangleToRectangle(pRect, rect)) { this.goThroughDoor(digit); return; }
    }

    // Items.
    for (const item of this.items) {
      if (item.active && Phaser.Math.Distance.Between(p.x, p.y, item.x, item.y) < 14) this.collect(item);
    }

    // Bench.
    this.nearBench = this.benches.find((b) => Math.abs(b.x - p.x) < 16 && Math.abs(b.y - p.y) < 20) || null;
    if (this.nearBench && p.upPressed && p.onGround) this.rest();

    // Highlight the ring the hookshot would grab.
    this.targetAnchor = state.hasHook ? this.findAnchor(p) : null;
    for (const a of this.anchors) a.setScale(a === this.targetAnchor ? 1.25 + Math.sin(time / 90) * 0.1 : 1);

    // Boss arena trigger.
    if (this.boss && this.boss.mode === 'dormant' && p.x > 9 * TILE) this.startBossFight(time);
  }

  goThroughDoor(digit) {
    const target = linkTarget(this.roomId, digit);
    if (!target) return;
    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    this.cameras.main.fadeOut(120, 11, 13, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ room: target.room, door: target.door }));
  }

  // ---------- Combat ----------

  resolveAttack(rect, aim, facing) {
    const result = { pogo: false };
    const A = CONFIG.attack;
    for (const e of this.enemies.getChildren().slice()) {
      if (e.active && Phaser.Geom.Intersects.RectangleToRectangle(rect, e.getBounds())) {
        e.takeHit(A.damage, facing);
        this.addSong(CONFIG.song.perHit);
        this.hitSpark(e.x, e.y);
        result.pogo = true;
      }
    }
    if (this.boss && !this.boss.harmless && Phaser.Geom.Intersects.RectangleToRectangle(rect, this.boss.getBounds())) {
      const res = this.boss.takeNeedle(A.damage);
      if (res === 'hit') { this.addSong(CONFIG.song.perHit); this.hitSpark(this.boss.x, this.boss.y); }
      else {
        this.hitSpark(rect.centerX, rect.centerY, 0x9aa3b5);
        this.player.body.setVelocityX(-facing * 140);
        this.notice('It rings hollow. A bomb could crack that shell.');
      }
      result.pogo = true;
    }
    for (const h of this.hazards.getChildren().slice()) {
      if (h.active && h.texture.key === 'bell' && Phaser.Geom.Intersects.RectangleToRectangle(rect, h.getBounds())) {
        this.puff(h.x, h.y, 0x9c7a3c);
        h.destroy();
        result.pogo = true;
      }
    }
    if (aim === 'down' && this.spikes.some((s) => Phaser.Geom.Intersects.RectangleToRectangle(rect, s))) result.pogo = true;
    for (const lever of this.levers) {
      if (!state.gateOpen && Phaser.Geom.Intersects.RectangleToRectangle(rect, lever.getBounds())) this.openGate(lever);
    }
    return result;
  }

  addSong(n) {
    state.song = Math.min(CONFIG.song.max, state.song + n);
  }

  findAnchor(p) {
    const H = CONFIG.hook;
    let best = null;
    let bestScore = Infinity;
    for (const a of this.anchors) {
      if (a === p.recentAnchor && this.time.now < p.recentAnchorUntil) continue;
      const dx = a.x - p.x;
      const dy = a.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > H.range || d < 12) continue;
      const score = d - (dx * p.facing > 0 ? 60 : 0) - (dy < 0 ? 20 : 0);
      if (score < bestScore) { bestScore = score; best = a; }
    }
    return best;
  }

  // Hookshot with no ring in range: the chain stuns the first enemy in line.
  hookChain(p) {
    const H = CONFIG.hook;
    let hit = null;
    let hitDist = H.chainRange;
    for (const e of this.enemies.getChildren()) {
      const dx = (e.x - p.x) * p.facing;
      if (dx > 0 && dx < hitDist && Math.abs(e.y - p.y) < 18) { hit = e; hitDist = dx; }
    }
    const endX = p.x + p.facing * hitDist;
    const g = this.add.graphics().setDepth(9);
    g.lineStyle(1, 0xd8dbe8, 1).lineBetween(p.x + p.facing * 4, p.y - 4, endX, p.y - 4);
    g.fillStyle(0xf0c75e, 1).fillRect(endX - 2, p.y - 6, 4, 4);
    this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
    if (hit) { hit.stun(H.stunMs); this.hitSpark(hit.x, hit.y, 0x88c0ff); }
  }

  throwBomb(p) {
    if (this.activeBomb && this.activeBomb.active) return false;
    const B = CONFIG.bomb;
    const bomb = this.bombs.create(p.x + p.facing * 8, p.y - 6, 'bomb');
    bomb.setDepth(9);
    bomb.body.setSize(8, 8);
    bomb.setBounce(0.35);
    bomb.setDragX(160);
    bomb.setVelocity(p.facing * B.throwX + p.body.velocity.x * 0.3, B.throwY);
    this.activeBomb = bomb;
    this.tweens.add({ targets: bomb, scale: 1.25, duration: 120, yoyo: true, repeat: -1 });
    this.time.delayedCall(B.fuseMs, () => this.explode(bomb));
    return true;
  }

  explode(bomb) {
    if (!bomb.active) return;
    const B = CONFIG.bomb;
    const { x, y } = bomb;
    bomb.destroy();
    this.activeBomb = null;
    const ring = this.add.circle(x, y, B.radius, 0xffd166, 0.55).setDepth(12);
    this.tweens.add({ targets: ring, alpha: 0, scale: 1.3, duration: 260, onComplete: () => ring.destroy() });
    this.cameras.main.shake(180, 0.007);
    let changed = false;
    for (const block of this.solids.getChildren().slice()) {
      if (block.getData('type') !== 'B') continue;
      const cells = block.getData('cells');
      const reached = cells.some(([c, r]) => Phaser.Math.Distance.Between(x, y, c * TILE + 8, r * TILE + 8) <= B.radius + 8);
      if (reached) {
        for (const [c, r] of cells) state.broken.push(cellId(this.roomId, c, r));
        this.removeSolid(block, 0x5d6386);
        changed = true;
      }
    }
    for (const e of this.enemies.getChildren().slice()) {
      if (e.active && Phaser.Math.Distance.Between(x, y, e.x, e.y) <= B.radius + 8) e.takeHit(B.damage, Math.sign(e.x - x) || 1);
    }
    if (this.boss && !this.boss.harmless && Phaser.Math.Distance.Between(x, y, this.boss.x, this.boss.y) <= B.radius + 22) {
      this.boss.onBomb(this.time.now);
    }
    if (changed) saveState();
  }

  // ---------- World interactions ----------

  onPlayerTouchSolid(player, tile) {
    const type = tile.getData('type');
    if (type === 'D') {
      if (state.hasKey) this.openBossDoor();
      else this.notice('Sealed. It needs a key.');
    } else if (type === 'G') {
      this.notice('The gate is barred from this side.');
    }
  }

  notice(text) {
    if (this.time.now < this.barredNoticeAt) return;
    this.barredNoticeAt = this.time.now + 2500;
    this.ui.toast(text);
  }

  openBossDoor() {
    for (const b of this.solids.getChildren().slice()) if (b.getData('type') === 'D') this.removeSolid(b, 0xf0c75e);
    state.bossDoorOpen = true;
    saveState();
    this.ui.banner('THE DOOR OPENS', 'Something waits beyond.');
  }

  openGate(lever) {
    lever.setTexture('lever_on');
    for (const b of this.solids.getChildren().slice()) if (b.getData('type') === 'G') this.removeSolid(b, 0x8a8fa8);
    state.gateOpen = true;
    saveState();
    this.cameras.main.shake(200, 0.004);
    this.ui.banner('SHORTCUT OPENED', 'The gate to the Awakening Cave is open.');
  }

  collect(item) {
    const ch = item.getData('ch');
    const id = item.getData('id');
    const def = ITEMS[ch];
    if (!def) return;
    state.collected.push(id);
    if (def.flag) state[def.flag] = true;
    if (ch === '+') { state.maxHearts += 1; state.hearts = state.maxHearts; }
    this.puff(item.x, item.y, 0xf0c75e);
    item.destroy();
    this.items = this.items.filter((i) => i !== item);
    saveState();
    this.ui.banner(def.title, typeof def.text === 'function' ? def.text() : def.text);
  }

  rest() {
    state.hearts = state.maxHearts;
    state.bench = { room: this.roomId };
    saveState();
    this.ui.banner('RESTED', 'Health restored. Progress saved.');
    this.hitSpark(this.player.x, this.player.y - 6, 0xf0c75e);
  }

  // ---------- Player events ----------

  onHeal(p) {
    this.hitSpark(p.x, p.y - 8, 0xf0c75e);
  }

  onPlayerHurt() {
    this.cameras.main.shake(140, 0.006);
    this.cameras.main.flash(80, 200, 60, 60);
  }

  onPlayerDeath() {
    this.transitioning = true;
    this.puff(this.player.x, this.player.y, 0xc8443a);
    this.player.setVisible(false);
    this.time.delayedCall(700, () => {
      this.cameras.main.fadeOut(250, 11, 13, 26);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        state.hearts = state.maxHearts;
        state.song = 0;
        const room = state.bench ? state.bench.room : WORLD.start;
        this.scene.restart({ room, message: { title: 'YOU FELL', text: 'The song carries you back to the last bench.' } });
      });
    });
  }

  // ---------- Boss ----------

  startBossFight(time) {
    const door = Object.values(doorRects(this.room))[0];
    this.arenaLock = [];
    if (door) {
      const c = door.edge === 'left' ? door.c0 + 1 : door.c0 - 1;
      const cells = [];
      for (let r = door.r0; r <= door.r1; r++) { this.addTileImage(c, r, 'gate'); cells.push([c, r]); }
      this.arenaLock.push(this.addSolidBlock(c, door.r0, c, door.r1, 'lock', cells));
    }
    this.boss.wake(time);
    this.ui.showBoss(this.boss);
    this.ui.banner('WARDEN OF THE BELL', 'It guards the last verse of the song.');
  }

  spawnBells(n) {
    const p = this.player;
    const minX = 2 * TILE;
    const maxX = (this.room.w - 2) * TILE;
    const spacing = 44;
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Clamp(p.x + (i - (n - 1) / 2) * spacing + Phaser.Math.Between(-8, 8), minX, maxX);
      const marker = this.add.triangle(x, TILE + 6, 0, 0, 10, 0, 5, 8, 0xe0524a).setDepth(12);
      this.tweens.add({ targets: marker, alpha: 0.2, duration: 110, yoyo: true, repeat: 3 });
      this.time.delayedCall(700 + i * 90, () => {
        marker.destroy();
        if (!this.boss || this.boss.harmless) return;
        const bell = this.hazards.create(x, TILE + 8, 'bell');
        bell.setDepth(9);
        bell.body.setSize(10, 10);
        bell.onSolid = () => { this.puff(bell.x, bell.y, 0x9c7a3c); bell.destroy(); };
      });
    }
  }

  spawnShockwaves(x, floorY) {
    for (const dir of [-1, 1]) {
      const w = this.hazards.create(x + dir * 14, floorY - 7, 'shock');
      w.setDepth(9);
      w.body.setAllowGravity(false);
      w.body.setSize(10, 8);
      w.setVelocityX(dir * CONFIG.boss.shockwaveSpeed);
      w.setFlipX(dir < 0);
      w.onSolid = () => w.destroy();
      this.time.delayedCall(2600, () => w.active && w.destroy());
    }
  }

  onBossPhase2() {
    this.ui.banner('ITS SHELL HARDENS', 'Your needle bounces off. Try a bomb.');
    this.cameras.main.shake(300, 0.006);
  }

  onBossDefeated(boss) {
    state.bossDefeated = true;
    saveState();
    for (const h of this.hazards.getChildren().slice()) h.destroy();
    this.cameras.main.shake(600, 0.01);
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 120, () => this.puff(boss.x + Phaser.Math.Between(-16, 16), boss.y + Phaser.Math.Between(-18, 18), 0xf0c75e));
    this.tweens.add({ targets: boss, alpha: 0, duration: 900, onComplete: () => boss.destroy() });
    for (const s of this.arenaLock || []) this.removeSolid(s);
    this.arenaLock = [];
    this.ui.hideBoss();
    this.time.delayedCall(1100, () => this.ui.showVictory());
  }

  // ---------- Effects ----------

  slashFx(rect, aim, facing) {
    const g = this.add.graphics().setDepth(11);
    g.lineStyle(2, 0xf2efe6, 0.95);
    const cx = rect.centerX;
    const cy = rect.centerY;
    g.beginPath();
    if (aim === 'side') g.arc(cx - facing * 10, cy, 14, facing > 0 ? -1.1 : Math.PI - 1.1, facing > 0 ? 1.1 : Math.PI + 1.1);
    else if (aim === 'up') g.arc(cx, cy + 10, 14, Math.PI + 0.4, -0.4);
    else g.arc(cx, cy - 10, 14, 0.4, Math.PI - 0.4);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 120, onComplete: () => g.destroy() });
  }

  dashTrail(p) {
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 40, () => {
        const ghost = this.add.image(p.x, p.y, 'zink').setFlipX(p.facing < 0).setTint(0x5ec4b6).setAlpha(0.5).setDepth(9);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 180, onComplete: () => ghost.destroy() });
      });
    }
  }

  hitSpark(x, y, color = 0xffffff) {
    for (let i = 0; i < 5; i++) {
      const s = this.add.image(x, y, 'spark').setTint(color).setDepth(12).setScale(0.75);
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * 14, y: y + Math.sin(a) * 14, alpha: 0, duration: 220, onComplete: () => s.destroy() });
    }
  }

  puff(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const s = this.add.image(x, y, 'spark').setTint(color).setDepth(12);
      const a = (i / 8) * Math.PI * 2;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18, alpha: 0, scale: 0.3, duration: 360, onComplete: () => s.destroy() });
    }
  }
}
