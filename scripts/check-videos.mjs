// Checks that every how-to video in src/data/videos.ts still exists and allows embedding.
// YouTube's oEmbed endpoint fails for removed, private and embed-disabled videos.
// Usage: npm run check:videos
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/data/videos.ts', import.meta.url), 'utf8');
const entries = [...src.matchAll(/^\s+'?([\w-]+)'?: \{ youtubeId: '([\w-]{11})'/gm)].map((m) => ({
  exercise: m[1],
  youtubeId: m[2],
}));

const unique = [...new Set(entries.map((e) => e.youtubeId))];
console.log(`Checking ${unique.length} videos used by ${entries.length} exercises…`);

const broken = new Map();
const queue = [...unique];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const id = queue.shift();
      const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
      try {
        const res = await fetch(url);
        if (!res.ok) broken.set(id, `HTTP ${res.status}`);
      } catch (err) {
        broken.set(id, `network error: ${err.message}`);
      }
    }
  }),
);

if (broken.size === 0) {
  console.log('All videos are available and embeddable.');
} else {
  for (const e of entries) {
    if (broken.has(e.youtubeId)) console.log(`✗ ${e.exercise}: ${e.youtubeId} (${broken.get(e.youtubeId)})`);
  }
  console.log(`\n${broken.size} video(s) need replacing in src/data/videos.ts.`);
  process.exitCode = 1;
}
