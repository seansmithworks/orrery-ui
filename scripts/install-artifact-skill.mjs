#!/usr/bin/env node
// node scripts/install-artifact-skill.mjs --dry-run [--skill-dir <dir>]
// Summarises how artifact/ differs from the installed artifact-house-style skill. Reads only; writes nothing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (!args.includes('--dry-run')) {
  console.error('usage: node scripts/install-artifact-skill.mjs --dry-run [--skill-dir <dir>]\nOnly --dry-run exists: installing is not implemented yet.');
  process.exit(2);
}
const at = args.indexOf('--skill-dir');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../artifact');
const skill = at >= 0 ? path.resolve(args[at + 1]) : path.join(os.homedir(), '.claude/skills/artifact-house-style');

const SKIP = new Set(['.DS_Store', '__pycache__', 'node_modules']);
function list(dir) {
  if (!fs.existsSync(dir)) return new Map();
  const out = new Map();
  for (const rel of fs.readdirSync(dir, { recursive: true })) {
    if (rel.split(path.sep).some((p) => SKIP.has(p))) continue;
    const full = path.join(dir, rel);
    if (fs.statSync(full).isFile()) out.set(rel, fs.readFileSync(full));
  }
  return out;
}
const lines = (buf) => buf.toString('utf8').split('\n');
function lineDelta(a, b) {
  const count = (arr) => arr.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const ca = count(lines(a)), cb = count(lines(b));
  let added = 0, removed = 0;
  for (const [l, n] of cb) added += Math.max(0, n - (ca.get(l) ?? 0));
  for (const [l, n] of ca) removed += Math.max(0, n - (cb.get(l) ?? 0));
  return `+${added} -${removed} lines`;
}

const src = list(repo), dst = list(skill);
const onlyRepo = [...src.keys()].filter((f) => !dst.has(f)).sort();
const onlySkill = [...dst.keys()].filter((f) => !src.has(f)).sort();
const changed = [...src.keys()].filter((f) => dst.has(f) && !src.get(f).equals(dst.get(f))).sort();
const same = [...src.keys()].filter((f) => dst.has(f) && src.get(f).equals(dst.get(f))).length;

console.log(`dry run: artifact/ (repo) vs ${skill} (installed). Nothing is written.`);
if (!fs.existsSync(skill)) console.log('installed skill not found: an install would add every repo file.');
console.log(`${same} identical, ${changed.length} differ, ${onlyRepo.length} only in repo (an install would add), ${onlySkill.length} only installed (an install would leave or remove)`);
const section = (title, files, note = () => '') => {
  if (!files.length) return;
  console.log(`\n${title}`);
  for (const f of files) console.log(`  ${f}${note(f)}`);
};
section('differ (repo vs installed):', changed, (f) => `  ${lineDelta(dst.get(f), src.get(f))}`);
section('only in repo:', onlyRepo);
section('only installed:', onlySkill);
