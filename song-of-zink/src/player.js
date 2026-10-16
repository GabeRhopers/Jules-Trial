import * as Phaser from 'phaser';
import { CONFIG } from './config.js';
import { state } from './save.js';
import { vHeld, vPressed, vReleased } from './input.js';

const { JustDown, JustUp } = Phaser.Input.Keyboard;
const NEVER = -1e9;

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, facing = 1) {
    super(scene, x, y, 'zink');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(10, 20).setOffset(3, 4);
    this.body.setMaxVelocity(1000, CONFIG.player.maxFall);
    this.setCollideWorldBounds(true);
    this.setDepth(10);

    this.keys = scene.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,Z,SPACE,X,C,A,S,D');
    this.mode = 'normal'; // normal | dash | hook | hurt
    this.setFacing(facing);
    this.lastGround = NEVER;
    this.jumpBuffered = NEVER;
    this.lockUntil = 0;
    this.canCut = false;
    this.airDash = true;
    this.dashReady = 0;
    this.attackReady = 0;
    this.hookReady = 0;
    this.bombReady = 0;
    this.invulnUntil = 0;
    this.healTime = 0;
    this.dead = false;

    this.fx = scene.add.graphics().setDepth(11);
  }

  setFacing(f) {
    this.facing = f;
    this.setFlipX(f < 0);
  }

  get onGround() {
    return this.body.blocked.down || this.body.touching.down;
  }

  // -1 = wall on the left, 1 = wall on the right, 0 = none.
  wallSide() {
    const b = this.body;
    const ys = [b.top + 3, b.bottom - 3];
    const left = ys.some((y) => this.scene.isSolidAt(b.left - 2, y));
    const right = ys.some((y) => this.scene.isSolidAt(b.right + 2, y));
    if (right && (this.facing > 0 || !left)) return 1;
    if (left) return -1;
    return 0;
  }

  update(time, delta) {
    this.fx.clear();
    if (this.dead) return;
    const P = CONFIG.player;
    const k = this.keys;
    const body = this.body;
    const onGround = this.onGround;

    // Read every "just pressed" once per frame, from keyboard and touch buttons.
    // `|` (not `||`) so every source is read and cleared each frame.
    const jumpPressed = JustDown(k.Z) | JustDown(k.SPACE) | vPressed('jump');
    const jumpReleased = JustUp(k.Z) | JustUp(k.SPACE) | vReleased('jump');
    const attackPressed = JustDown(k.X) | vPressed('attack');
    const dashPressed = JustDown(k.C) | vPressed('dash');
    const hookPressed = JustDown(k.A) | vPressed('hook');
    const bombPressed = JustDown(k.S) | vPressed('bomb');
    this.upPressed = !!(JustDown(k.UP) | vPressed('up'));

    const dir = (k.RIGHT.isDown || vHeld('right') ? 1 : 0) - (k.LEFT.isDown || vHeld('left') ? 1 : 0);
    if (onGround) { this.lastGround = time; this.airDash = true; }
    if (jumpPressed) this.jumpBuffered = time;

    this.setAlpha(time < this.invulnUntil && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);

    if (this.mode === 'dash') {
      if (time >= this.dashUntil) this.endDash();
      else { body.setVelocity(this.facing * P.dashSpeed, 0); return; }
    }
    if (this.mode === 'hook') { this.updateHook(time); return; }
    if (this.mode === 'hurt') {
      if (time >= this.hurtUntil) this.mode = 'normal';
      else return;
    }

    // Song heal: hold D on the ground.
    const S = CONFIG.song;
    if ((k.D.isDown || vHeld('heal')) && onGround && state.song >= S.healCost && state.hearts < state.maxHearts) {
      this.healTime += delta;
      body.setVelocityX(0);
      const p = Math.min(1, this.healTime / S.healHoldMs);
      this.fx.lineStyle(2, 0xf0c75e, 0.9);
      this.fx.beginPath();
      this.fx.arc(this.x, this.y - 2, 14, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      this.fx.strokePath();
      if (this.healTime >= S.healHoldMs) {
        this.healTime = 0;
        state.hearts += 1;
        state.song -= S.healCost;
        this.scene.onHeal(this);
      }
      return;
    }
    this.healTime = 0;

    // Run.
    if (time >= this.lockUntil) {
      body.setVelocityX(dir * P.runSpeed);
      if (dir) this.setFacing(dir);
    }

    // Jump, coyote jump, wall jump.
    if (time - this.jumpBuffered <= P.jumpBufferMs) {
      if (onGround || time - this.lastGround <= P.coyoteMs) {
        body.setVelocityY(-P.jumpVelocity);
        this.jumpBuffered = NEVER;
        this.lastGround = NEVER;
        this.canCut = true;
      } else {
        const wall = this.wallSide();
        if (wall) {
          body.setVelocity(-wall * P.wallJumpX, -P.wallJumpY);
          this.setFacing(-wall);
          this.lockUntil = time + P.wallJumpLockMs;
          this.jumpBuffered = NEVER;
          this.canCut = false; // wall jumps are always full height, like Hollow Knight
          this.airDash = true;
        }
      }
    }
    if (jumpReleased && this.canCut && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * P.jumpCutMultiplier);
      this.canCut = false;
    }
    if (body.velocity.y >= 0) this.canCut = false;

    // Wall slide while pushing into a wall.
    if (!onGround && body.velocity.y > P.wallSlideSpeed && dir !== 0 && this.wallSide() === dir) {
      body.setVelocityY(P.wallSlideSpeed);
    }

    // Actions (one per frame).
    if (dashPressed && time >= this.dashReady && (onGround || this.airDash)) this.startDash(time, onGround);
    else if (attackPressed && time >= this.attackReady) this.attack(time, onGround);
    else if (hookPressed && state.hasHook && time >= this.hookReady) this.fireHook(time);
    else if (bombPressed && state.hasBombs && time >= this.bombReady) {
      if (this.scene.throwBomb(this)) this.bombReady = time + CONFIG.bomb.cooldownMs;
    }

    // Squash and stretch for feel.
    const vy = body.velocity.y;
    this.setScale(1, onGround ? 1 : Phaser.Math.Clamp(1 + Math.abs(vy) / 2200, 1, 1.12));
  }

  startDash(time, onGround) {
    const P = CONFIG.player;
    this.mode = 'dash';
    this.dashUntil = time + P.dashMs;
    this.dashReady = time + P.dashCooldownMs;
    if (!onGround) this.airDash = false;
    this.body.setAllowGravity(false);
    this.body.setVelocity(this.facing * P.dashSpeed, 0);
    this.scene.dashTrail(this);
  }

  endDash() {
    this.mode = 'normal';
    this.body.setAllowGravity(true);
    this.body.setVelocityX(this.facing * CONFIG.player.runSpeed * 0.6);
  }

  attack(time, onGround) {
    const A = CONFIG.attack;
    this.attackReady = time + A.cooldownMs;
    let aim = 'side';
    if (this.keys.UP.isDown || vHeld('up')) aim = 'up';
    else if ((this.keys.DOWN.isDown || vHeld('down')) && !onGround) aim = 'down';
    const b = this.body;
    let rect;
    if (aim === 'side') rect = new Phaser.Geom.Rectangle(this.facing > 0 ? b.right : b.left - A.range, b.center.y - 11, A.range, 22);
    else if (aim === 'up') rect = new Phaser.Geom.Rectangle(b.center.x - 13, b.top - A.range, 26, A.range);
    else rect = new Phaser.Geom.Rectangle(b.center.x - 13, b.bottom, 26, A.range);
    this.scene.slashFx(rect, aim, this.facing);
    const result = this.scene.resolveAttack(rect, aim, this.facing);
    if (aim === 'down' && result.pogo) {
      b.setVelocityY(-A.pogoVelocity);
      this.airDash = true;
      this.canCut = false;
    }
  }

  fireHook(time) {
    const H = CONFIG.hook;
    this.hookReady = time + H.cooldownMs;
    const anchor = this.scene.findAnchor(this);
    if (!anchor) { this.scene.hookChain(this); return; }
    this.mode = 'hook';
    this.hookTarget = anchor;
    this.hookUntil = time + H.maxPullMs;
    this.body.setAllowGravity(false);
    this.setFacing(anchor.x >= this.x ? 1 : -1);
  }

  updateHook(time) {
    const H = CONFIG.hook;
    const t = this.hookTarget;
    const tx = t.x;
    const ty = t.y + 12; // hang just below the ring
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    this.fx.lineStyle(1, 0xd8dbe8, 1);
    this.fx.lineBetween(this.x + this.facing * 4, this.y - 4, t.x, t.y);
    const b = this.body.blocked;
    if (d < 10 || time > this.hookUntil || (time > this.hookUntil - H.maxPullMs + 120 && (b.left || b.right || b.up))) {
      this.endHook(true);
    } else {
      this.body.setVelocity((dx / d) * H.pullSpeed, (dy / d) * H.pullSpeed);
    }
  }

  endHook(pop) {
    const H = CONFIG.hook;
    const now = this.scene.time.now;
    this.mode = 'normal';
    this.body.setAllowGravity(true);
    if (pop) {
      this.body.setVelocity(this.facing * H.popVelocityX, H.popVelocityY);
      this.lockUntil = now + H.popLockMs; // keep the swing's momentum briefly
    }
    this.recentAnchor = this.hookTarget;
    this.recentAnchorUntil = now + 400; // don't re-grab the ring you just left
    this.airDash = true;
    this.canCut = false;
  }

  // Returns true if damage was taken.
  hurt(amount, fromX, opts = {}) {
    const time = this.scene.time.now;
    if (this.dead || time < this.invulnUntil) return false;
    const P = CONFIG.player;
    state.hearts = Math.max(0, state.hearts - amount);
    this.invulnUntil = time + P.invulnMs;
    this.scene.onPlayerHurt(this);
    if (state.hearts <= 0) {
      this.dead = true;
      this.body.setVelocity(0, 0);
      this.body.setAllowGravity(false);
      this.scene.onPlayerDeath();
      return true;
    }
    if (!opts.noKnockback) {
      if (this.mode === 'dash') this.endDash();
      if (this.mode === 'hook') this.endHook(false);
      this.mode = 'hurt';
      this.hurtUntil = time + 180;
      const s = Math.sign(this.x - fromX) || -this.facing;
      this.body.setVelocity(s * P.knockbackX, -P.knockbackY);
    }
    return true;
  }

  teleport(x, y) {
    if (this.mode === 'dash') this.endDash();
    if (this.mode === 'hook') this.endHook(false);
    this.mode = 'normal';
    this.body.reset(x, y);
  }
}
