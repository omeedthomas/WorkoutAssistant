/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('.', import.meta.url));
const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : f.endsWith('.ts') && !f.endsWith('.test.ts') ? [p] : [];
  });

/** Things only one app has: each app does storage, speech, env config and UI its own way. */
const APP_ONLY = [
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bwindow\./,
  /\bdocument\./,
  /\bnavigator\./,
  /\bspeechSynthesis\b/,
  /import\.meta\.env/,
  /from 'react'/,
  /from 'react-native'/,
  /from 'expo/,
];

describe('@ascent/core', () => {
  it('uses no browser, React or React Native APIs, so the web and mobile apps can both run it', () => {
    const found = sources(root).flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return APP_ONLY.filter((re) => re.test(text)).map((re) => `${relative(root, file)}: ${re}`);
    });
    expect(found).toEqual([]);
  });
});
