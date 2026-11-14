#!/usr/bin/env node
// npm run tokens:check: rebuild into a temp dir and fail if anything differs from the committed tokens/generated/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { TOKENS } from './lib/source.mjs';

const committed = path.join(TOKENS, 'generated');
const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'orrery-tokens-'));
const list = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort() : []);

let bad = [];
try {
  execFileSync(process.execPath, [path.join(TOKENS, 'build.mjs'), '--out', fresh], { stdio: ['ignore', 'ignore', 'inherit'] });
  for (const f of new Set([...list(committed), ...list(fresh)])) {
    const a = path.join(committed, f), b = path.join(fresh, f);
    if (!fs.existsSync(a)) bad.push(`not committed: tokens/generated/${f}`);
    else if (!fs.existsSync(b)) bad.push(`no longer generated: tokens/generated/${f}`);
    else if (!fs.readFileSync(a).equals(fs.readFileSync(b))) bad.push(`differs from source: tokens/generated/${f}`);
  }
} catch (e) {
  bad = [`build failed: ${e.message.split('\n')[0]}`];
} finally {
  fs.rmSync(fresh, { recursive: true, force: true });
}
if (bad.length) {
  console.error(bad.join('\n') + '\nRun npm run tokens:build and commit tokens/generated/.');
  process.exit(1);
}
console.log('tokens:check: tokens/generated/ matches the source');
