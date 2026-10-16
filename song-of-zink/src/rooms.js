// Room text format: one character per 16x16 tile. Lines starting with ';' are comments.
export const LEGEND = {
  '#': 'wall',
  '.': 'empty',
  ' ': 'empty',
  P: 'player start',
  S: 'bench (rest + save)',
  E: 'crawler enemy',
  F: 'flyer enemy',
  W: 'Warden boss',
  H: 'hookshot ring',
  B: 'cracked wall (bombs break it)',
  '^': 'spikes',
  K: 'hookshot item',
  O: 'bombs item',
  '+': 'heart vessel',
  k: 'vault key',
  D: 'boss door (needs key)',
  G: 'gate (opened by lever)',
  L: 'lever',
};
for (let d = 1; d <= 9; d++) LEGEND[String(d)] = `door ${d}`;

export const SOLID_CHARS = new Set(['#', 'B', 'D', 'G']);
const UNIQUE_IN_WORLD = ['K', 'O', 'k', 'W'];

export function parseRoom(id, text) {
  const rows = text.replace(/\r/g, '').split('\n').filter((l) => l.length > 0 && !l.startsWith(';'));
  const w = rows.length ? rows[0].length : 0;
  return { id, w, h: rows.length, rows };
}

export function cellsOf(room, ch) {
  const out = [];
  room.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] === ch) out.push({ c, r });
  });
  return out;
}

// Groups door cells by digit into rectangles and finds which edge each door sits on.
export function doorRects(room) {
  const doors = {};
  room.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch >= '1' && ch <= '9') {
        const d = doors[ch] || (doors[ch] = { c0: c, r0: r, c1: c, r1: r });
        d.c0 = Math.min(d.c0, c); d.r0 = Math.min(d.r0, r);
        d.c1 = Math.max(d.c1, c); d.r1 = Math.max(d.r1, r);
      }
    }
  });
  for (const d of Object.values(doors)) {
    d.edge = d.c0 === 0 ? 'left' : d.c1 === room.w - 1 ? 'right' : d.r0 === 0 ? 'top' : d.r1 === room.h - 1 ? 'bottom' : 'inside';
  }
  return doors;
}

export function parseLinkEnd(s) {
  const [room, door] = String(s).split(':');
  return { room, door };
}

export function buildLinkIndex(world) {
  const index = {};
  for (const [a, b] of world.links || []) {
    index[a] = parseLinkEnd(b);
    index[b] = parseLinkEnd(a);
  }
  return index;
}

// Returns a list of human-readable problems. Empty list = world is valid.
export function validateWorld(world, rooms) {
  const errors = [];
  const ids = Object.keys(world.rooms || {});
  if (!world.start || !rooms[world.start]) errors.push(`start room "${world.start}" does not exist`);

  for (const id of ids) {
    const room = rooms[id];
    if (!room) { errors.push(`${id}: listed in world.json but rooms/${id}.txt is missing`); continue; }
    if (room.h < 3) errors.push(`${id}: room is too small`);
    room.rows.forEach((row, r) => {
      if (row.length !== room.w) errors.push(`${id}: row ${r} has ${row.length} characters, expected ${room.w}`);
      for (const ch of row) if (!(ch in LEGEND)) errors.push(`${id}: unknown character "${ch}" in row ${r}`);
    });
    for (const [digit, d] of Object.entries(doorRects(room))) {
      if (d.edge !== 'left' && d.edge !== 'right') errors.push(`${id}: door ${digit} must sit on the left or right edge`);
      if (d.c0 !== d.c1) errors.push(`${id}: door ${digit} must be one column wide`);
    }
  }
  for (const id of Object.keys(rooms)) if (!world.rooms[id]) errors.push(`${id}: rooms/${id}.txt exists but is not listed in world.json`);

  const used = new Set();
  for (const link of world.links || []) {
    if (!Array.isArray(link) || link.length !== 2) { errors.push(`bad link ${JSON.stringify(link)}`); continue; }
    for (const end of link) {
      if (used.has(end)) errors.push(`door ${end} is linked more than once`);
      used.add(end);
      const { room, door } = parseLinkEnd(end);
      if (!rooms[room]) { errors.push(`link ${end}: room "${room}" does not exist`); continue; }
      if (!doorRects(rooms[room])[door]) errors.push(`link ${end}: room ${room} has no door ${door}`);
    }
  }
  for (const id of ids) {
    if (!rooms[id]) continue;
    for (const digit of Object.keys(doorRects(rooms[id]))) {
      if (!used.has(`${id}:${digit}`)) errors.push(`${id}: door ${digit} is not linked to anything`);
    }
  }

  if (rooms[world.start] && cellsOf(rooms[world.start], 'P').length !== 1) errors.push(`start room must contain exactly one P`);
  for (const ch of UNIQUE_IN_WORLD) {
    const n = ids.reduce((sum, id) => sum + (rooms[id] ? cellsOf(rooms[id], ch).length : 0), 0);
    if (n !== 1) errors.push(`"${ch}" (${LEGEND[ch]}) must appear exactly once in the world, found ${n}`);
  }

  // Every room must be reachable from the start through links.
  const index = buildLinkIndex(world);
  const seen = new Set([world.start]);
  const queue = [world.start];
  while (queue.length) {
    const id = queue.shift();
    if (!rooms[id]) continue;
    for (const digit of Object.keys(doorRects(rooms[id]))) {
      const t = index[`${id}:${digit}`];
      if (t && !seen.has(t.room)) { seen.add(t.room); queue.push(t.room); }
    }
  }
  for (const id of ids) if (!seen.has(id)) errors.push(`${id}: cannot be reached from the start room`);
  return errors;
}
