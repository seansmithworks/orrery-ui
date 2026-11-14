#!/usr/bin/env node
// npm run tokens:build [-- --out <dir>] [--tool terrazzo|sd]
// Source: tokens/ (DTCG). Outputs: the Artifact contract tokens.json, CSS per brand, one Swift file.
// Client brands (artifact/brands/*.tokens.json) pass through head.py, the single brand gate.
import fs from 'node:fs';
import path from 'node:path';
import { REPO, TOKENS, loadBrand, brandOverlay } from './lib/source.mjs';
import { contract, css, swift } from './lib/emit.mjs';

const args = process.argv.slice(2);
const opt = (flag, dflt) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : dflt);
const out = path.resolve(opt('--out', path.join(TOKENS, 'generated')));
const { resolve } = await import(`./lib/resolve.${opt('--tool', 'terrazzo')}.mjs`);

async function build(brand, overlay) {
  const b = loadBrand(brand, overlay);
  for (const m of b.modes) m.tokens = await resolve(brand, m);
  return b;
}

const written = [];
const write = (rel, text) => {
  const f = path.join(out, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
  written.push(path.relative(REPO, f));
};

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
console.log(written.join('\n'));
