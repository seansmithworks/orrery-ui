// Gates for tokens:build and tokens:check. Each returns null when it passes, or one failure line.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO } from './source.mjs';

const HEAD = path.join(REPO, 'artifact/head.py');
const show = (v) => (v === undefined ? 'missing' : JSON.stringify(v));

/** A color whose hex and components disagree (srgb only: other spaces carry hex as a fallback). */
function colorMismatch(c) {
  if (!c || typeof c !== 'object' || c.hex === undefined || c.colorSpace !== 'srgb') return null;
  const fromComponents = '#' + c.components.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  return fromComponents === c.hex.toLowerCase() ? null : `hex ${c.hex} does not match components ${JSON.stringify(c.components)} (${fromComponents})`;
}

/** Failure lines for every color (and shadow color) in one mode's resolved tokens whose hex and components disagree. */
export function colorGate(tokens, where) {
  const bad = [];
  for (const [id, t] of Object.entries(tokens)) {
    const colors = t.type === 'color' ? [t.value] : t.type === 'shadow' ? t.value.map((s) => s.color) : [];
    for (const c of colors) {
      const why = colorMismatch(c);
      if (why) bad.push(`color mismatch: ${id} (${where}): ${why}`);
    }
  }
  return bad;
}

function firstDiff(a, b, at) {
  if (a === b) return null;
  const obj = (v) => v !== null && typeof v === 'object';
  if (!obj(a) || !obj(b) || Array.isArray(a) !== Array.isArray(b)) return { at, a, b };
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = firstDiff(a[k], b[k], at ? `${at}.${k}` : k);
    if (d) return d;
  }
  return null;
}

/** The generated contract deep-equals the Artifact snapshot. */
export function snapshotGate(generated, snapshot, snapshotFile) {
  const d = firstDiff(generated, snapshot, '');
  return d && `snapshot mismatch: tokens/generated/tokens.json vs ${snapshotFile}: first difference at ${d.at}: generated ${show(d.a)}, snapshot ${show(d.b)}`;
}

/** Custom property declarations in a stylesheet, as "selector path | --name" -> value. head.py's bundle.css tail is not tokens. */
export function tokenDeclarations(cssText) {
  const text = cssText.split('/* bundle.css */')[0].replace(/\/\*[\s\S]*?\*\/|<\/?style>/g, '');
  const out = new Map();
  const stack = [];
  let buf = '';
  for (const ch of text) {
    if (ch === '{') { stack.push(buf.trim()); buf = ''; }
    else if (ch === '}' || ch === ';') {
      const m = /^(--[^:\s]+)\s*:\s*([\s\S]+)$/.exec(buf.trim());
      if (m && stack.length) out.set(`${stack.join(' ')} | ${m[1]}`, m[2].trim());
      if (ch === '}') stack.pop();
      buf = '';
    } else buf += ch;
  }
  return out;
}

/** The generated CSS declares the same tokens, with the same values, as head.py's output. */
export function cssGate(generatedCss, headCss, cssFile, headLabel) {
  const a = tokenDeclarations(generatedCss), b = tokenDeclarations(headCss);
  for (const k of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    if (a.get(k) !== b.get(k)) return `head.py mismatch: ${cssFile} vs ${headLabel}: first difference at ${k}: generated ${show(a.get(k))}, head.py ${show(b.get(k))}`;
  }
  return a.size ? null : `head.py mismatch: ${cssFile} vs ${headLabel}: no token declarations found`;
}

/** head.py's output for a snapshot folder and an optional brand file. head.py is the single brand gate; this only runs it. */
export function headOutput(snapshotDir, brandFile) {
  const args = ['-I', HEAD, '--snapshot', snapshotDir, ...(brandFile ? ['--brand', brandFile] : [])];
  return execFileSync('python3', args, { encoding: 'utf8' });
}

const listFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort() : []);

/** Failure lines for every file that differs between the committed tokens/generated/ and a fresh build of the source. */
export function driftGate(committed, fresh) {
  const bad = [];
  for (const f of new Set([...listFiles(committed), ...listFiles(fresh)])) {
    const a = path.join(committed, f), b = path.join(fresh, f);
    if (!fs.existsSync(a)) bad.push(`not committed: tokens/generated/${f}`);
    else if (!fs.existsSync(b)) bad.push(`no longer generated: tokens/generated/${f}`);
    else if (!fs.readFileSync(a).equals(fs.readFileSync(b))) bad.push(`differs from source: tokens/generated/${f}`);
  }
  return bad;
}
