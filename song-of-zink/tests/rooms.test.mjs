import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseRoom, validateWorld, doorRects } from '../src/rooms.js';

const dir = new URL('../rooms/', import.meta.url);
const world = JSON.parse(readFileSync(new URL('world.json', dir), 'utf8'));
const rooms = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.txt'))) {
  const id = f.replace(/\.txt$/, '');
  rooms[id] = parseRoom(id, readFileSync(new URL(f, dir), 'utf8'));
}

test('the shipped world is valid', () => {
  assert.deepEqual(validateWorld(world, rooms), []);
});

test('doors are detected on the correct edge', () => {
  const d = doorRects(rooms.r5);
  assert.equal(d['1'].edge, 'left');
  assert.equal(d['3'].edge, 'left');
  assert.equal(d['2'].edge, 'right');
});

test('validator catches broken rooms', () => {
  const bad = { ...rooms, r2: parseRoom('r2', '#####\n#..#\n#####\n') };
  const errors = validateWorld(world, bad);
  assert.ok(errors.some((e) => e.includes('row 1 has 4 characters')));
  assert.ok(errors.some((e) => e.includes('room r2 has no door')));
});

test('validator catches unreachable rooms and unknown characters', () => {
  const w2 = { ...world, rooms: { ...world.rooms, r9: { name: 'Island', map: [0, 0, 1, 1] } } };
  const r2 = { ...rooms, r9: parseRoom('r9', '#####\n#.?.#\n#####\n') };
  const errors = validateWorld(w2, r2);
  assert.ok(errors.some((e) => e.includes('r9: cannot be reached')));
  assert.ok(errors.some((e) => e.includes('unknown character "?"')));
});
