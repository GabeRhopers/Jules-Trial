import { CONFIG } from './config.js';

const KEY = 'song-of-zink.save.v1';

export function defaultState() {
  return {
    bench: null, // { room } of the last bench rested at; null = start room
    hasHook: false,
    hasBombs: false,
    hasKey: false,
    maxHearts: CONFIG.player.startHearts,
    hearts: CONFIG.player.startHearts,
    song: 0,
    collected: [], // item ids "room:col,row"
    broken: [], // cracked wall ids
    gateOpen: false,
    bossDoorOpen: false,
    bossDefeated: false,
    visited: [],
    playTimeMs: 0,
  };
}

function load() {
  const s = defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(s, JSON.parse(raw));
  } catch (e) {
    // Storage blocked or corrupt: start fresh.
  }
  s.hearts = s.maxHearts;
  s.song = 0;
  return s;
}

// Shared, mutable game progress. Rooms read and write it directly.
export const state = load();

export function saveState() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Ignore: the game still works without saving.
  }
}

export function resetState() {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, defaultState());
  saveState();
}
