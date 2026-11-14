#!/usr/bin/env node
// npm run tokens:build [-- --out <dir>]
// Source: tokens/ (DTCG). Outputs: the Artifact contract tokens.json, CSS per brand, one Swift file.
// Client brands (artifact/brands/*.tokens.json) pass through head.py, the single brand gate.
// The build prunes its output folder, so it only writes into a folder that is missing, empty, or a previous build (marked by MARKER).
import fs from 'node:fs';
import path from 'node:path';
import { REPO, TOKENS, loadBrand, brandOverlay } from './lib/source.mjs';
import { contract, css, swift } from './lib/emit.mjs';
import { resolve } from './lib/resolve.mjs';
import { colorGate } from './lib/gates.mjs';

const usage = (why) => {
  console.error(`tokens:build: ${why}\nusage: node tokens/build.mjs [--out <dir>]`);
  process.exit(2);
};
const refuse = (why) => {
  console.error(`tokens:build: ${why}`);
  process.exit(2);
};
const args = process.argv.slice(2);
const generated = path.join(TOKENS, 'generated');
let out = generated;
if (args.includes('--out')) {
  const v = args[args.indexOf('--out') + 1];
  if (v === undefined || v.startsWith('--')) usage('--out needs a folder');
  out = path.resolve(v);
}
// Resolve symlinks so a link cannot hide where the folder really is; a missing tail is resolved against its nearest existing parent.
const real = (p) => {
  const tail = [];
  let cur = p;
  while (!fs.existsSync(cur)) {
    tail.unshift(path.basename(cur));
    cur = path.dirname(cur);
  }
  return path.join(fs.realpathSync(cur), ...tail);
};
const inside = (parent, child) => !path.relative(parent, child).startsWith('..') && !path.isAbsolute(path.relative(parent, child));
const MARKER = '.orrery-tokens-build';
const realOut = real(out);
if (realOut !== real(generated)) {
  if (inside(realOut, real(REPO)) || inside(real(REPO), realOut)) refuse(`--out ${out} overlaps the repo; use tokens/generated or a folder outside the repo`);
  // Only a missing, empty, or previously built folder may be pruned; anything else is the user's.
  if (fs.existsSync(realOut) && fs.readdirSync(realOut).length && !fs.existsSync(path.join(realOut, MARKER))) refuse(`--out ${out} is not empty and is not a previous token build; use a missing or empty folder`);
}

async function build(brand, overlay) {
  const b = loadBrand(brand, overlay);
  const bad = [];
  for (const m of b.modes) {
    m.tokens = await resolve(brand, m);
    bad.push(...colorGate(m.tokens, `brand ${b.name}, mode ${m.id}`));
  }
  if (bad.length) {
    console.error(bad.join('\n'));
    process.exit(1);
  }
  return b;
}

const files = new Map();
const write = (rel, text) => files.set(rel, text);
write(MARKER, 'Written by npm run tokens:build. A folder with this file may be pruned by the next build.\n');

const orrery = await build('orrery');
const shape = contract(orrery.modes);
write('tokens.json', JSON.stringify(shape, null, 2) + '\n');
write(`css/${orrery.name}.css`, css(orrery.modes, orrery.name));

const brands = [orrery];
const clientDir = path.join(REPO, 'artifact/brands');
for (const f of fs.readdirSync(clientDir).filter((f) => f.endsWith('.tokens.json')).sort()) {
  const b = await build('orrery', brandOverlay(path.join(clientDir, f), shape));
  write(`css/${b.name}.css`, css(b.modes, b.name));
  brands.push(b);
}
write('swift/OrreryTokens.swift', swift(brands));

// Everything built: now clear what is stale, then write. A failed build above leaves the folder untouched.
if (fs.existsSync(out)) {
  for (const e of fs.readdirSync(out, { recursive: true, withFileTypes: true })) {
    const f = path.join(e.parentPath, e.name);
    if (!e.isDirectory() && !files.has(path.relative(out, f))) fs.rmSync(f);
  }
  const dirs = fs.readdirSync(out, { recursive: true, withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(e.parentPath, e.name));
  for (const d of dirs.sort().reverse()) if (!fs.readdirSync(d).length) fs.rmdirSync(d);
}
for (const [rel, text] of files) {
  const f = path.join(out, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
}
console.log([...files.keys()].map((rel) => path.relative(REPO, path.join(out, rel))).join('\n'));
