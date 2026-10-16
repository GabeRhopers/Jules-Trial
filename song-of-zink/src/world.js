// `zink-rooms` is generated at build time from rooms/*.txt and rooms/world.json.
import { world, texts } from 'zink-rooms';
import { parseRoom, validateWorld, buildLinkIndex } from './rooms.js';

export const WORLD = world;
export const ROOMS = {};
for (const [id, text] of Object.entries(texts)) ROOMS[id] = parseRoom(id, text);

export const WORLD_ERRORS = validateWorld(WORLD, ROOMS);
const LINKS = buildLinkIndex(WORLD);

export function linkTarget(roomId, digit) {
  return LINKS[`${roomId}:${digit}`] || null;
}
