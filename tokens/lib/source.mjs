// Tool-agnostic source loading. Merges layers by folder order (base, then brand, then mode)
// and turns a client brand file into one more layer. head.py is the only brand gate:
// a brand file reaches the build only as head.py's validated --print-tokens output.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const TOKENS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(TOKENS, '..');
const HEAD = path.join(REPO, 'artifact/head.py');

const readDir = (dir) => fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.tokens.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
  : [];

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
// Later layers win. Objects merge key by key; a $value is replaced whole.
export function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k !== '$value' && isObj(v) && isObj(a[k]) ? merge(a[k], v) : v;
  return out;
}

const ext = (doc) => doc?.$extensions?.['com.orrery'] ?? {};

/** One merged DTCG document per mode for a brand folder under tokens/brands/. */
export function loadBrand(brand = 'orrery', overlay = null) {
  const base = readDir(path.join(TOKENS, 'base')).reduce(merge, {});
  const brandDocs = readDir(path.join(TOKENS, 'brands', brand));
  const withBrand = brandDocs.reduce(merge, base);
  const order = ext(withBrand).modes;
  const modeDir = path.join(TOKENS, 'brands', brand, 'modes');
  const modes = order.map((id) => {
    const doc = JSON.parse(fs.readFileSync(path.join(modeDir, `${id}.tokens.json`), 'utf8'));
    let merged = merge(withBrand, doc);
    if (overlay) merged = merge(merged, overlay(id));
    return { id, name: ext(doc).mode.name, doc: merged };
  });
  return { name: overlay?.brandName ?? ext(withBrand).name, modes };
}

/**
 * A client brand file (artifact/brands/*.tokens.json) as a layer on top of brand orrery.
 * head.py validates it against the contract tokens built from the repo source and
 * prints the result; whatever head.py changed becomes the overlay. Exits on rejection.
 */
export function brandOverlay(brandFile, contract) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orrery-brand-'));
  let branded;
  try {
    fs.writeFileSync(path.join(dir, 'tokens.json'), JSON.stringify(contract));
    branded = JSON.parse(execFileSync('python3', ['-I', HEAD, '--snapshot', dir, '--brand', brandFile, '--print-tokens'], { encoding: 'utf8' }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const file = JSON.parse(fs.readFileSync(brandFile, 'utf8'));
  const before = Object.fromEntries(contract.color.tokens.map((t) => [t.name, t.value]));
  const toDtcg = (v) => {
    if (v.startsWith('{')) return v.replace(/^\{([^}]+)\}$/, '{color.$1}');
    const c = [1, 3, 5].map((i) => +(parseInt(v.slice(i, i + 2), 16) / 255).toFixed(4));
    return { colorSpace: 'srgb', components: c, hex: v.toLowerCase() };
  };
  const overlay = (mode) => {
    const layer = {};
    for (const t of branded.color.tokens) {
      if (t.value[mode] !== before[t.name][mode]) (layer.color ??= {})[t.name] = { $value: toDtcg(t.value[mode]) };
    }
    for (const [k, v] of Object.entries(branded.type.families)) {
      if (v === contract.type.families[k]) continue;
      layer.font ??= { $extensions: { 'com.orrery': { fonts: [] } } };
      layer.font[k] = { $value: v.split(', ').map((n) => n.replace(/^"|"$/g, '')) };
      const url = file.font?.[k]?.$extensions?.['com.orrery']?.googleFonts;
      if (url) layer.font.$extensions['com.orrery'].fonts.push(url);
    }
    return layer;
  };
  overlay.brandName = ext(file).name;
  return overlay;
}
