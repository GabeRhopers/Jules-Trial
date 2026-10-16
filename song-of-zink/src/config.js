// Every tuning number lives here. Change a value, run `npm run build`, reload the page.
export const TILE = 16;

export const CONFIG = {
  view: { width: 960, height: 540, zoom: 2 },

  player: {
    runSpeed: 150,
    gravity: 1300,
    jumpVelocity: 390, // about 3.6 tiles high
    jumpCutMultiplier: 0.45, // releasing jump early cuts upward speed
    coyoteMs: 90, // you can still jump this long after walking off a ledge
    jumpBufferMs: 110, // a jump pressed this early before landing still counts
    maxFall: 420,
    wallSlideSpeed: 70,
    wallJumpX: 190,
    wallJumpY: 360,
    wallJumpLockMs: 160,
    dashSpeed: 360,
    dashMs: 150,
    dashCooldownMs: 420,
    startHearts: 5,
    invulnMs: 1000,
    knockbackX: 160,
    knockbackY: 220,
  },

  attack: { cooldownMs: 260, damage: 1, range: 22, pogoVelocity: 330 },

  song: { max: 9, perHit: 1, healCost: 3, healHoldMs: 700 },

  hook: {
    range: 175,
    pullSpeed: 430,
    popVelocityX: 130,
    popVelocityY: -250,
    maxPullMs: 900,
    popLockMs: 220, // after a pull, how long the forward pop ignores the arrow keys
    cooldownMs: 250,
    chainRange: 140,
    stunMs: 1500,
  },

  bomb: { fuseMs: 1000, radius: 36, damage: 2, throwX: 140, throwY: -170, cooldownMs: 600 },

  crawler: { hp: 3, speed: 38 },
  flyer: { hp: 2, speed: 55, aggroRange: 150 },

  boss: {
    hp: 20,
    phase2At: 10, // at this HP the Warden grows a shell that only bombs can crack
    armorBreakMs: 5000,
    chargeSpeed: 250,
    idleMs: [900, 600], // phase 1, phase 2
    bells: [3, 5],
    shockwaveSpeed: 190,
  },
};
