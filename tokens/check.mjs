#!/usr/bin/env node
// npm run tokens:check [-- --snapshot <dir>]: rebuild into a temp dir, then three gates.
//   1. drift: the rebuild equals the committed tokens/generated/.
//   2. snapshot: the generated contract tokens.json deep-equals <snapshot>/tokens.json.
//   3. head.py: each generated CSS file declares the same tokens as head.py's output, with no brand and for every client brand.
// --snapshot defaults to artifact/snapshot, the folder head.py reads.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO, TOKENS } from './lib/source.mjs';
import { snapshotGate, cssGate, headOutput } from './lib/gates.mjs';

const args = process.argv.slice(2);
let snapshot = path.join(REPO, 'artifact/snapshot');
if (args.length) {
  if (args.length !== 2 || args[0] !== '--snapshot') {
    console.error('usage: node tokens/check.mjs [--snapshot <dir>]');
    process.exit(2);
  }
  snapshot = path.resolve(args[1]);
}
const rel = (f) => path.relative(REPO, f);

const committed = path.join(TOKENS, 'generated');
const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'orrery-tokens-'));
const list = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort() : []);

const drift = [];
const gates = [];
try {
  execFileSync(process.execPath, [path.join(TOKENS, 'build.mjs'), '--out', fresh], { stdio: ['ignore', 'ignore', 'inherit'] });
  for (const f of new Set([...list(committed), ...list(fresh)])) {
    const a = path.join(committed, f), b = path.join(fresh, f);
    if (!fs.existsSync(a)) drift.push(`not committed: tokens/generated/${f}`);
    else if (!fs.existsSync(b)) drift.push(`no longer generated: tokens/generated/${f}`);
    else if (!fs.readFileSync(a).equals(fs.readFileSync(b))) drift.push(`differs from source: tokens/generated/${f}`);
  }

  const snapshotFile = path.join(snapshot, 'tokens.json');
  const contract = JSON.parse(fs.readFileSync(path.join(fresh, 'tokens.json'), 'utf8'));
  gates.push(snapshotGate(contract, JSON.parse(fs.readFileSync(snapshotFile, 'utf8')), rel(snapshotFile)));

  const brandDir = path.join(REPO, 'artifact/brands');
  const brandFiles = fs.readdirSync(brandDir).filter((f) => f.endsWith('.tokens.json')).sort().map((f) => path.join(brandDir, f));
  for (const brandFile of [null, ...brandFiles]) {
    const name = brandFile ? JSON.parse(fs.readFileSync(brandFile, 'utf8')).$extensions['com.orrery'].name : 'orrery';
    const label = `artifact/head.py${brandFile ? ` --brand ${rel(brandFile)}` : ''}`;
    gates.push(cssGate(fs.readFileSync(path.join(fresh, 'css', `${name}.css`), 'utf8'), headOutput(snapshot, brandFile), `tokens/generated/css/${name}.css`, label));
  }
} catch (e) {
  gates.push(`check failed: ${e.message.split('\n')[0]}`);
} finally {
  fs.rmSync(fresh, { recursive: true, force: true });
}

const bad = [...drift, ...gates.filter(Boolean)];
if (bad.length) {
  console.error(bad.join('\n') + (drift.length ? '\nRun npm run tokens:build and commit tokens/generated/.' : ''));
  process.exit(1);
}
console.log('tokens:check: tokens/generated/ matches the source, the Artifact snapshot and head.py');
