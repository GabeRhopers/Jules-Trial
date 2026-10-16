// Plays key parts of the game in a headless browser. Run: npm run smoke (after npm run build).
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'test-output');
mkdirSync(outDir, { recursive: true });
const url = pathToFileURL(join(root, 'dist/play.html')).href;

const fallbackChrome = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(fallbackChrome) ? { executablePath: fallbackChrome } : {});
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) errors.push(`console: ${m.text()}`); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());

const results = [];
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (e) {
    failed++;
    results.push(`FAIL  ${name}: ${e.message}`);
    await page.screenshot({ path: join(outDir, `fail-${name.replace(/\W+/g, '-')}.png`) }).catch(() => {});
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const wait = (ms) => page.waitForTimeout(ms);
const z = (fn, arg) => page.evaluate(fn, arg);
const player = () => z(() => { const s = window.__zink.scene; const p = s.player; return { x: p.x, y: p.y, mode: p.mode, room: s.roomId, hearts: window.__zink.state.hearts, onGround: p.onGround, wall: p.wallSide(), dead: p.dead }; });
async function ready() { await page.waitForFunction(() => window.__zink && window.__zink.ready, null, { timeout: 15000 }); await wait(250); }
async function warp(room, door) { await z(([r, d]) => window.__zink.warp(r, d), [room, door]); await wait(100); await ready(); }
async function teleport(x, y, facing) {
  await z(([x, y, f]) => { const p = window.__zink.scene.player; p.teleport(x, y); p.setFacing(f); }, [x, y, facing]);
  await wait(150);
}
async function tap(key, ms = 60) { await page.keyboard.down(key); await wait(ms); await page.keyboard.up(key); }
async function waitFor(fn, timeout = 2000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if (await z(fn)) return true; await wait(30); }
  return false;
}
const T = 16;

await page.goto(url);
await z(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload();
await ready();
await page.click('#focus-hint');
await z(() => window.__zink.newGame());
await ready();

await check('boots in the Awakening Cave', async () => {
  const p = await player();
  assert(p.room === 'r1', `room ${p.room}`);
  await page.screenshot({ path: join(outDir, '01-start.png') });
});

await check('runs right', async () => {
  const a = await player();
  await page.keyboard.down('ArrowRight'); await wait(700); await page.keyboard.up('ArrowRight');
  const b = await player();
  assert(b.x - a.x > 30, `moved ${b.x - a.x}px`);
});

await check('jumps', async () => {
  await wait(300);
  const a = await player();
  await page.keyboard.down('z');
  let minY = a.y;
  for (let i = 0; i < 10; i++) { await wait(30); minY = Math.min(minY, (await player()).y); }
  await page.keyboard.up('z');
  assert(a.y - minY > 30, `rose ${a.y - minY}px`);
});

await check('dashes', async () => {
  await wait(600);
  const a = await player();
  await page.keyboard.down('c');
  const dashed = await waitFor(() => window.__zink.scene.player.mode === 'dash', 500);
  await page.keyboard.up('c');
  await waitFor(() => window.__zink.scene.player.mode !== 'dash', 1000);
  const b = await player();
  assert(dashed, 'never entered dash');
  assert(Math.abs(b.x - a.x) > 20, `dash moved ${b.x - a.x}px`);
});

await check('needle kills a crawler and fills the song meter', async () => {
  await teleport(31 * T, 12 * T - 12, 1); // top of the step, crawler patrols to the right
  const killed = await (async () => {
    for (let i = 0; i < 40; i++) {
      const s = await z(() => { const sc = window.__zink.scene; const e = sc.enemies.getChildren()[0]; return e ? { ex: e.x, px: sc.player.x } : null; });
      if (!s) return true;
      await z((ex) => { const p = window.__zink.scene.player; p.teleport(ex - 18, 15 * 16 + 4); p.setFacing(1); }, s.ex);
      await wait(40);
      await tap('x', 40);
      await wait(280);
    }
    return false;
  })();
  assert(killed, 'crawler still alive');
  const song = await z(() => window.__zink.state.song);
  assert(song >= 3, `song ${song}`);
});

await check('door leads to the Root Corridor', async () => {
  await teleport(37 * T, 15 * T + 4, 1);
  await page.keyboard.down('ArrowRight'); await wait(400); await page.keyboard.up('ArrowRight');
  await ready();
  const p = await player();
  assert(p.room === 'r2', `room ${p.room}`);
});

await check('hookshot chain crosses the spike pit in room 3', async () => {
  await warp('r3', '1');
  await z(() => window.__zink.give('hasHook'));
  await teleport(17 * T + 4, 15 * T + 4, 1);
  const hearts = (await player()).hearts;
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 3; i++) {
    await tap('a', 40);
    const hooked = await waitFor(() => window.__zink.scene.player.mode === 'hook', 300);
    assert(hooked, `hook ${i + 1} did not fire`);
    await waitFor(() => window.__zink.scene.player.mode !== 'hook', 1500);
    await wait(i < 2 ? 120 : 0);
  }
  await page.keyboard.down('ArrowRight');
  await waitFor(() => window.__zink.scene.player.onGround, 2500);
  await page.keyboard.up('ArrowRight');
  const p = await player();
  await page.screenshot({ path: join(outDir, '02-hookshot.png') });
  assert(p.x > 38 * T, `landed at x=${Math.round(p.x)} (needs > ${38 * T})`);
  assert(p.hearts === hearts, 'took damage');
});

await check('hookshot chain crosses the Chasm Garden', async () => {
  await warp('r4', '1');
  await teleport(10 * T, 15 * T - 12, 1);
  const hearts = (await player()).hearts;
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 4; i++) {
    await tap('a', 40);
    const hooked = await waitFor(() => window.__zink.scene.player.mode === 'hook', 300);
    assert(hooked, `hook ${i + 1} did not fire`);
    await waitFor(() => window.__zink.scene.player.mode !== 'hook', 1500);
    await wait(i < 3 ? 120 : 0);
  }
  await page.keyboard.down('ArrowRight');
  await waitFor(() => window.__zink.scene.player.onGround, 2500);
  await page.keyboard.up('ArrowRight');
  const p = await player();
  assert(p.x > 36 * T && p.hearts === hearts, `landed at x=${Math.round(p.x)}, hearts ${p.hearts}/${hearts}`);
});

await check('wall jumps up the shaft and exits to the Bell Bench', async () => {
  // A bot climbing by key presses is sensitive to frame timing, so allow a few attempts like a player would.
  let reached = false;
  for (let attempt = 0; attempt < 4 && !reached; attempt++) {
    await teleport(44 * T + 8, 24 * T - 12, 1);
    let dir = 'ArrowRight';
    await page.keyboard.down(dir);
    for (let i = 0; i < 24; i++) {
      const now = await player();
      if (now.y + 12 < 10 * T && now.x > 46 * T) { reached = true; break; } // beside the block, feet above its top
      const want = dir === 'ArrowRight' ? 1 : -1;
      await waitFor(new Function(`return window.__zink.scene.player.wallSide() === ${want} || window.__zink.scene.player.onGround`), 700);
      await tap('z', 90);
      await page.keyboard.up(dir);
      dir = dir === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(dir);
      await wait(60);
    }
    await page.keyboard.up(dir);
  }
  assert(reached, 'never reached the top of the shaft');
  await page.keyboard.down('ArrowRight');
  await waitFor(() => window.__zink.scene.transitioning || window.__zink.scene.roomId === 'r5', 3000);
  await page.keyboard.up('ArrowRight');
  await ready();
  const p = await player();
  assert(p.room === 'r5', `still in ${p.room} at (${Math.round(p.x / T)}, ${Math.round(p.y / T)})`);
});

await check('lever opens the shortcut gate', async () => {
  await warp('r5', '1');
  await teleport(9 * T, 7 * T - 12, -1);
  await tap('x', 40);
  await wait(200);
  assert(await z(() => window.__zink.state.gateOpen), 'gate still closed');
});

await check('bomb breaks the cracked wall in the Bomb Forge', async () => {
  await warp('r6', '2'); // arrive from the vault side, right of the cracked wall
  await z(() => window.__zink.give('hasBombs'));
  await teleport(46 * T, 15 * T + 4, -1);
  await tap('s', 40);
  await wait(1300);
  const broken = await z(() => window.__zink.state.broken.filter((id) => id.startsWith('r6:')).length);
  assert(broken === 3, `broken tiles: ${broken}`);
});

await check('progress survives a reload', async () => {
  await page.reload();
  await ready();
  const s = await z(() => ({ broken: window.__zink.state.broken.length, gate: window.__zink.state.gateOpen }));
  assert(s.broken >= 3 && s.gate, JSON.stringify(s));
});

await check('spikes hurt and return you to safe ground', async () => {
  await warp('r3', '1');
  await teleport(12 * T, 15 * T + 4, 1);
  await wait(200);
  const before = await player();
  await teleport(25 * T, 15 * T + 2, 1);
  await wait(300);
  const after = await player();
  assert(after.hearts === before.hearts - 1, `hearts ${before.hearts} -> ${after.hearts}`);
  assert(after.x < 18 * T, `respawned at x=${Math.round(after.x)}`);
});

await check('dying returns you to the last bench with full health', async () => {
  await z(() => { window.__zink.state.bench = { room: 'r5' }; window.__zink.state.hearts = 1; });
  await z(() => { const sc = window.__zink.scene; sc.player.invulnUntil = 0; sc.player.hurt(1, 0); });
  await wait(1600);
  await ready();
  const p = await player();
  const st = await z(() => ({ hearts: window.__zink.state.hearts, max: window.__zink.state.maxHearts }));
  assert(p.room === 'r5' && st.hearts === st.max, `room ${p.room}, hearts ${st.hearts}/${st.max}`);
});

await check('Warden fight starts, shell blocks the needle, bombs finish it', async () => {
  await warp('r8', '1');
  await z(() => { window.__zink.give('hasBombs'); });
  await page.keyboard.down('ArrowRight'); await wait(1100); await page.keyboard.up('ArrowRight');
  const started = await z(() => window.__zink.scene.boss && window.__zink.scene.boss.mode !== 'dormant');
  assert(started, 'boss did not wake');
  await wait(1500);
  await page.screenshot({ path: join(outDir, '03-boss.png') });
  // Freeze the boss in phase 2 with 1 HP, then check needle vs shell and bomb.
  await z(() => { const b = window.__zink.scene.boss; b.hp = 1; b.mode = 'recover'; b.nextAt = 1e12; b.body.reset(30 * 16, 15 * 16 - 6); b.armorBrokenUntil = 0; });
  await z(() => { const s = window.__zink.scene; s.player.invulnUntil = 1e12; s.player.teleport(26 * 16, 15 * 16 + 4); s.player.setFacing(1); });
  await wait(100);
  await tap('x', 40);
  await wait(100);
  assert(await z(() => window.__zink.scene.boss.hp === 1), 'needle should clang off the shell');
  await z(() => { const s = window.__zink.scene; s.player.teleport(28 * 16, 15 * 16 + 4); s.player.setFacing(1); });
  await tap('s', 40);
  await wait(1400);
  assert(await z(() => window.__zink.state.bossDefeated), 'boss not defeated');
  await wait(1200);
  assert(await z(() => window.__zink.game.scene.getScene('UI').victory.visible), 'victory screen not shown');
  await page.screenshot({ path: join(outDir, '04-victory.png') });
});

// ---------- Phone ----------
const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const mobile = await phone.newPage();
mobile.on('pageerror', (e) => errors.push(`phone pageerror: ${e.message}`));
await mobile.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await mobile.goto(url);
await mobile.waitForFunction(() => window.__zink && window.__zink.ready, null, { timeout: 15000 });
const mz = (fn, arg) => mobile.evaluate(fn, arg);
// Holds a touch on an element (offset from its center as a fraction of its size).
async function touchHold(selector, ms, fx = 0, fy = 0) {
  let during = null;
  await mz(([sel, fx, fy]) => {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect();
    const o = { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: r.left + r.width * (0.5 + fx / 2), clientY: r.top + r.height * (0.5 + fy / 2) };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    window.__held = { el, o };
  }, [selector, fx, fy]);
  await mobile.waitForTimeout(ms);
  during = await mz(() => ({ vx: window.__zink.scene.player.body.velocity.x }));
  await mz(() => { const { el, o } = window.__held; el.dispatchEvent(new PointerEvent('pointerup', o)); });
  return during;
}

await check('phone: touch controls show and the game fits the screen', async () => {
  const layout = await mz(() => {
    const f = document.getElementById('game-frame').getBoundingClientRect();
    return { touch: document.body.classList.contains('touch'), pad: !document.getElementById('touch').hidden, frameBottom: f.bottom, frameH: f.height, scrollW: document.documentElement.scrollWidth, w: window.innerWidth };
  });
  assert(layout.touch && layout.pad, 'touch controls not enabled');
  assert(layout.frameH <= 390, `game is ${Math.round(layout.frameH)}px tall on a 390px screen`);
  assert(layout.scrollW <= layout.w, 'page scrolls sideways');
  await mobile.locator('#focus-hint').tap();
  await mobile.waitForTimeout(300);
  await mobile.screenshot({ path: join(outDir, '05-phone.png') });
});

await check('phone: d-pad moves and JUMP jumps', async () => {
  const p0 = await mz(() => window.__zink.scene.player.x);
  const held = await touchHold('#dpad', 600, 0.9, 0);
  const p1 = await mz(() => window.__zink.scene.player.x);
  assert(held.vx > 100, `running speed while holding the pad: ${held.vx}`);
  assert(p1 > p0, 'did not move');
  await mobile.waitForTimeout(150);
  const stopped = await mz(() => window.__zink.scene.player.body.velocity.x);
  assert(stopped === 0, `still moving after release (${stopped})`);
  await mobile.waitForTimeout(300);
  const y0 = await mz(() => window.__zink.scene.player.y);
  await mz(() => { window.__minY = 1e9; window.__t = setInterval(() => { window.__minY = Math.min(window.__minY, window.__zink.scene.player.y); }, 16); });
  await touchHold('.a-jump', 250);
  await mobile.waitForTimeout(150);
  const minY = await mz(() => { clearInterval(window.__t); return window.__minY; });
  assert(y0 - minY > 15, `jump rose ${Math.round(y0 - minY)}px`);
});

await check('phone: portrait shows the turn-sideways notice', async () => {
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.waitForTimeout(200);
  const shown = await mz(() => getComputedStyle(document.getElementById('rotate')).display !== 'none');
  assert(shown, 'rotate notice hidden in portrait');
});
await phone.close();

await check('no errors in the console', async () => {
  assert(errors.length === 0, errors.slice(0, 5).join(' | '));
});

await browser.close();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
