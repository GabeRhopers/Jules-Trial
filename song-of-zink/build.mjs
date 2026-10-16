// Builds dist/index.html (page body, used for publishing) and dist/play.html (full standalone page).
import { build } from 'esbuild';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const roomsDir = join(root, 'rooms');

// Virtual module: every rooms/*.txt plus rooms/world.json. Add a room by adding a file.
const roomsPlugin = {
  name: 'zink-rooms',
  setup(b) {
    b.onResolve({ filter: /^zink-rooms$/ }, () => ({ path: 'zink-rooms', namespace: 'zink' }));
    b.onLoad({ filter: /.*/, namespace: 'zink' }, () => {
      const world = JSON.parse(readFileSync(join(roomsDir, 'world.json'), 'utf8'));
      const texts = {};
      for (const f of readdirSync(roomsDir).filter((f) => f.endsWith('.txt')).sort()) {
        texts[f.replace(/\.txt$/, '')] = readFileSync(join(roomsDir, f), 'utf8');
      }
      return {
        contents: `export const world = ${JSON.stringify(world)};\nexport const texts = ${JSON.stringify(texts)};`,
        loader: 'js',
        watchFiles: [join(roomsDir, 'world.json'), ...Object.keys(texts).map((id) => join(roomsDir, `${id}.txt`))],
      };
    });
  },
};

const result = await build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
  legalComments: 'none',
  plugins: [roomsPlugin],
  logLevel: 'warning',
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const banner = '/* The Song of Zink. Uses Phaser (MIT License, Copyright (c) 2024 Richard Davey, Phaser Studio Inc.) */\n';
const page = readFileSync(join(root, 'src/page.html'), 'utf8').replace('<!--GAME_SCRIPT-->', () => `<script>${banner}${js}</script>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/index.html'), page);
writeFileSync(
  join(root, 'dist/play.html'),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${page}\n</body>\n</html>\n`,
);
console.log(`Built dist/index.html and dist/play.html (${(page.length / 1024).toFixed(0)} KB)`);
