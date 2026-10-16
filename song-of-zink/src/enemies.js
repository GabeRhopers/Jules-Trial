import * as Phaser from 'phaser';
import { CONFIG } from './config.js';

class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, key, hp) {
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.hp = hp;
    this.stunUntil = 0;
    this.knockUntil = 0;
    this.setDepth(8);
  }

  get stunned() {
    return this.scene.time.now < this.stunUntil;
  }

  // Stunned enemies are harmless to touch.
  get harmless() {
    return this.stunned;
  }

  takeHit(damage, dirX) {
    if (!this.active) return;
    this.hp -= damage;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => { if (this.active) this.restoreTint(); });
    this.body.setVelocityX(dirX * 120);
    this.knockUntil = this.scene.time.now + 150;
    if (this.hp <= 0) {
      this.scene.puff(this.x, this.y, this.puffColor);
      this.destroy();
    }
  }

  stun(ms) {
    this.stunUntil = this.scene.time.now + ms;
    this.restoreTint();
  }

  restoreTint() {
    if (this.stunned) this.setTint(0x88c0ff);
    else this.clearTint();
  }
}

export class Crawler extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'crawler', CONFIG.crawler.hp);
    this.puffColor = 0x9d84c8;
    this.dir = -1;
  }

  init() {
    this.body.setSize(16, 10).setOffset(1, 2);
  }

  update(time) {
    if (!this.active) return;
    if (this.tintStunned && !this.stunned) { this.tintStunned = false; this.clearTint(); }
    if (this.stunned) { this.tintStunned = true; this.body.setVelocityX(0); return; }
    if (time < this.knockUntil) return;
    const b = this.body;
    if (b.blocked.left) this.dir = 1;
    else if (b.blocked.right) this.dir = -1;
    else if (b.blocked.down) {
      const aheadX = this.dir > 0 ? b.right + 2 : b.left - 2;
      if (!this.scene.isSolidAt(aheadX, b.bottom + 4)) this.dir *= -1;
    }
    b.setVelocityX(this.dir * CONFIG.crawler.speed);
    this.setFlipX(this.dir < 0);
  }
}

export class Flyer extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'flyer', CONFIG.flyer.hp);
    this.puffColor = 0x5ec4b6;
    this.homeY = y;
  }

  init() {
    this.body.setAllowGravity(false);
    this.body.setSize(12, 10).setOffset(2, 1);
  }

  update(time) {
    if (!this.active) return;
    if (this.tintStunned && !this.stunned) { this.tintStunned = false; this.clearTint(); }
    if (this.stunned) { this.tintStunned = true; this.body.setVelocity(0, 0); return; }
    if (time < this.knockUntil) return;
    const p = this.scene.player;
    const F = CONFIG.flyer;
    const dx = p.x - this.x;
    const dy = p.y - 4 - this.y;
    const d = Math.hypot(dx, dy);
    if (!p.dead && d < F.aggroRange) {
      this.body.setVelocity((dx / d) * F.speed, (dy / d) * F.speed);
      this.setFlipX(dx < 0);
    } else {
      this.body.setVelocity(0, Math.sin(time / 300) * 18);
    }
    this.setScale(1, 0.85 + Math.abs(Math.sin(time / 90)) * 0.15);
  }
}
