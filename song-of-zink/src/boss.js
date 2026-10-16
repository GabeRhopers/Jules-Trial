import * as Phaser from 'phaser';
import { CONFIG } from './config.js';

// Warden of the Bell. Phase 1: charge, falling bells, slam with shockwaves.
// Phase 2 (HP <= phase2At): grows a shell. Needle bounces off; a bomb cracks it for a few seconds.
export class Warden extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'warden');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(28, 40).setOffset(4, 4);
    this.setCollideWorldBounds(true);
    this.setDepth(8);
    this.maxHp = CONFIG.boss.hp;
    this.hp = this.maxHp;
    this.mode = 'dormant';
    this.face = -1;
    this.nextAt = 0;
    this.armorBrokenUntil = 0;
    this.lastAttack = null;
    this.flashUntil = 0;
  }

  get phase() {
    return this.hp <= CONFIG.boss.phase2At ? 2 : 1;
  }

  get armored() {
    return this.phase === 2 && this.scene.time.now >= this.armorBrokenUntil;
  }

  get harmless() {
    return this.mode === 'dormant' || this.mode === 'dead';
  }

  wake(time) {
    this.mode = 'idle';
    this.nextAt = time + 900;
  }

  update(time) {
    if (!this.active || this.harmless) return;
    const B = CONFIG.boss;
    const p = this.scene.player;
    const body = this.body;

    if (time < this.flashUntil) this.setTintFill(0xffffff);
    else if (this.mode === 'telegraph' && Math.floor(time / 70) % 2 === 0) this.setTintFill(0xffe08a);
    else if (this.armored) this.setTint(0x9aa3b5);
    else if (this.phase === 2) this.setTint(0xffb38a);
    else this.clearTint();

    switch (this.mode) {
      case 'idle':
        body.setVelocityX(0);
        this.face = p.x < this.x ? -1 : 1;
        this.setFlipX(this.face > 0);
        if (time >= this.nextAt) this.chooseAttack(time);
        break;
      case 'telegraph':
        body.setVelocityX(0);
        if (time >= this.nextAt) this.unleash(time);
        break;
      case 'charge':
        body.setVelocityX(this.face * B.chargeSpeed);
        if ((this.face < 0 && body.blocked.left) || (this.face > 0 && body.blocked.right) || time > this.chargeUntil) {
          this.scene.cameras.main.shake(160, 0.006);
          this.recover(time, 550);
        }
        break;
      case 'jump':
        if (body.blocked.down && time > this.jumpStart + 200) {
          body.setVelocityX(0);
          this.scene.spawnShockwaves(this.x, body.bottom);
          this.scene.cameras.main.shake(180, 0.008);
          this.recover(time, 600);
        }
        break;
      case 'recover':
        body.setVelocityX(0);
        if (time >= this.nextAt) {
          this.mode = 'idle';
          this.nextAt = time + B.idleMs[this.phase - 1];
        }
        break;
      default:
        break;
    }
  }

  chooseAttack(time) {
    const options = ['charge', 'bells', 'slam'].filter((a) => a !== this.lastAttack);
    this.pending = Phaser.Utils.Array.GetRandom(options);
    this.lastAttack = this.pending;
    this.mode = 'telegraph';
    this.nextAt = time + (this.pending === 'charge' ? 520 : this.pending === 'bells' ? 380 : 300);
  }

  unleash(time) {
    const B = CONFIG.boss;
    const p = this.scene.player;
    if (this.pending === 'charge') {
      this.mode = 'charge';
      this.chargeUntil = time + 2500;
    } else if (this.pending === 'bells') {
      this.scene.spawnBells(B.bells[this.phase - 1]);
      this.recover(time, 900);
    } else {
      this.mode = 'jump';
      this.jumpStart = time;
      this.body.setVelocity(Phaser.Math.Clamp((p.x - this.x) * 1.2, -220, 220), -480);
    }
  }

  recover(time, ms) {
    this.mode = 'recover';
    this.nextAt = time + ms;
  }

  // Returns 'hit' or 'clang'.
  takeNeedle(damage) {
    if (this.armored) return 'clang';
    this.damage(damage);
    return 'hit';
  }

  onBomb(time) {
    if (this.harmless) return;
    this.armorBrokenUntil = time + CONFIG.boss.armorBreakMs;
    this.damage(CONFIG.bomb.damage);
  }

  damage(amount) {
    if (this.harmless) return;
    const before = this.phase;
    this.hp = Math.max(0, this.hp - amount);
    this.flashUntil = this.scene.time.now + 80;
    if (this.hp <= 0) {
      this.mode = 'dead';
      this.body.enable = false;
      this.scene.onBossDefeated(this);
      return;
    }
    if (before === 1 && this.phase === 2) this.scene.onBossPhase2(this);
  }
}
