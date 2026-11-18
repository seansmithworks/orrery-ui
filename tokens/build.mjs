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
import { systemGate, neutralGate, systemCss, systemSwift, motionModule } from './lib/system.mjs';
import { checker } from './lib/checks.mjs';
import { irisBridgeGate, irisBridgeCss } from './lib/bridge.mjs';

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
// --source <dir>: read base/ and brands/ from another folder (the gate tests seed bad tokens this way).
let source = TOKENS;
if (args.includes('--source')) {
  const v = args[args.indexOf('--source') + 1];
  if (v === undefined || v.startsWith('--')) usage('--source needs a folder');
  source = path.resolve(v);
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

const checks = checker(source);
const locked = checks.locks();
if (locked.length) {
  console.error(locked.join('\n'));
  process.exit(1);
}

async function build(brand, overlay) {
  const b = loadBrand(brand, overlay, source);
  const bad = checks.source(b);
  for (const m of bad.length ? [] : b.modes) {
    m.tokens = await resolve(brand, m);
    bad.push(...colorGate(m.tokens, `brand ${b.name}, mode ${m.id}`), ...checks.contrast(b, m));
    bad.push(...systemGate(m.tokens, m.doc, `brand ${b.name}, mode ${m.id}`));
    // Brand orrery itself, not a client brand layered on it (overlay) and not another brand folder.
    if (!overlay && brand === 'orrery') bad.push(...neutralGate(m.tokens, `brand ${b.name}, mode ${m.id}`));
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
// The Iris bridge (opt-in): mapping from bridges/iris.json; a --source folder without one uses the repo's.
const bridgeFile = path.join(fs.existsSync(path.join(source, 'bridges')) ? source : TOKENS, 'bridges/iris.json');
const bridge = JSON.parse(fs.readFileSync(bridgeFile, 'utf8')).map;
const light = orrery.modes.find((m) => m.id === 'light');
const badBridge = irisBridgeGate(bridge, light.tokens, fs.readFileSync(path.join(REPO, 'README.md'), 'utf8'), fs.readFileSync(path.join(REPO, 'src/styles.module.css'), 'utf8'), `brand ${orrery.name}, mode light`);
if (badBridge.length) {
  console.error(badBridge.join('\n'));
  process.exit(1);
}
const shape = contract(orrery.modes);
write('tokens.json', JSON.stringify(shape, null, 2) + '\n');
write(`css/${orrery.name}.css`, css(orrery.modes, orrery.name));
write(`css/${orrery.name}.system.css`, systemCss(orrery.modes, orrery.name));
write(`css/${orrery.name}.iris.css`, irisBridgeCss(bridge, orrery.name));
write('js/orrery.motion.mjs', motionModule(orrery.modes[0].doc));

const brands = [orrery];
const clientDir = path.join(REPO, 'artifact/brands');
for (const f of fs.readdirSync(clientDir).filter((f) => f.endsWith('.tokens.json')).sort()) {
  const b = await build('orrery', brandOverlay(path.join(clientDir, f), shape));
  write(`css/${b.name}.css`, css(b.modes, b.name));
  brands.push(b);
}
write('swift/OrreryTokens.swift', swift(brands) + systemSwift(brands));
// Any other brand folder: checked, then written as its own CSS and system CSS only. It stays out of
// the Artifact contract (tokens.json, head.py) and out of the Swift file, which needs a light and a dark mode.
for (const name of checks.brands) {
  if (name === 'orrery') continue;
  const b = await build(name);
  write(`css/${b.name}.css`, css(b.modes, b.name));
  write(`css/${b.name}.system.css`, systemCss(b.modes, b.name));
}
write('checks.md', checks.report());

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
