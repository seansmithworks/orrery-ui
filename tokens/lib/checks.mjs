// Build-time token checks: the brand lock list, opt-outs, required roles and WCAG contrast.
// Data lives in tokens/checks/ (brand.schema.json, contrast.pairs.json); the required roles are
// the leaves of base/roles.tokens.json. Every check returns failure lines; none of them writes.
import fs from 'node:fs';
import path from 'node:path';
import { TOKENS } from './source.mjs';

const CHECKS = path.join(TOKENS, 'checks');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const ext = (doc) => doc?.$extensions?.['com.orrery'] ?? {};
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const at = (doc, id) => id.split('.').reduce((n, k) => n?.[k], doc);
const tokenFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.tokens.json')).sort().map((f) => path.join(dir, f)) : []);

/** Dotted paths of every leaf node (a node with no child groups) in a DTCG document. */
export function leafPaths(node, prefix = '', out = []) {
  const kids = Object.entries(node).filter(([k, v]) => !k.startsWith('$') && isObj(v));
  if (!kids.length && prefix) out.push(prefix);
  for (const [k, v] of kids) leafPaths(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

/** The paths a document sets: its leaves that carry a $value. */
export const setPaths = (doc) => leafPaths(doc).filter((p) => at(doc, p).$value !== undefined);

/** A lock list entry is `*`, a whole group (`color.*`) or one path. */
export const unlocks = (unlocked, p) => unlocked.some((u) => u === '*' || u === p || (u.endsWith('.*') && p.startsWith(u.slice(0, -1))));

const optOutLabel = (o, i) => {
  const what = !isObj(o) ? 'not an object'
    : o.check !== undefined ? (o.role || o.surface ? `${o.check} ${o.role} on ${o.surface}${o.mode ? `, mode ${o.mode}` : ''}` : `check ${o.check}`)
    : o.role !== undefined ? `role ${o.role}` : 'empty';
  return `opt-out ${i + 1} (${what})`;
};

/** Reads a merged document's opt-outs. Returns the valid ones and a failure line for each bad one. */
export function readOptOuts(doc, brand, { schema, pairs, required }) {
  const raw = ext(doc).optOut ?? [];
  if (!Array.isArray(raw)) return { list: [], bad: [`opt-out: brand ${brand}: $extensions.com.orrery.optOut must be a list`] };
  const list = [], bad = [];
  raw.forEach((o, i) => {
    const label = optOutLabel(o, i);
    const fail = (why) => bad.push(`opt-out: brand ${brand}: ${label} ${why}`);
    if (!isObj(o)) return fail('must be an object');
    if (typeof o.reason !== 'string' || !o.reason.trim()) return fail('has no reason');
    if (o.check !== undefined) {
      if (!schema.optOut.checks.includes(o.check)) return fail(`names an unknown check (known: ${schema.optOut.checks.join(', ')})`);
      const onePair = o.role !== undefined || o.surface !== undefined;
      if (onePair && !pairs.pairs.some((p) => p.role === o.role && p.surface === o.surface)) return fail('names a pair that is not in tokens/checks/contrast.pairs.json');
      if (o.mode !== undefined && !ext(doc).modes.includes(o.mode)) return fail('names a mode the brand does not have');
    } else if (o.role !== undefined) {
      if (!required.includes(o.role)) return fail('names a role that base/roles.tokens.json does not require');
    } else return fail('names no role and no check');
    list.push({ ...o, label });
  });
  return { list, bad };
}

// WCAG 2.2 relative luminance and contrast ratio, on 8-bit sRGB (what a browser paints).
const channel = (v) => { const c = Math.round(v * 255) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
/** Contrast of a color on a surface. A see-through color is first laid over the surface. */
export function contrastRatio(fg, bg) {
  const a = fg.alpha ?? 1;
  const [hi, lo] = [luminance(fg.components.map((v, i) => v * a + bg.components[i] * (1 - a))), luminance(bg.components)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const two = (r) => (Math.floor(r * 100) / 100).toFixed(2);

/** One checker per build. `root` holds base/ and brands/. */
export function checker(root = TOKENS) {
  const schema = readJson(path.join(CHECKS, 'brand.schema.json'));
  const pairs = readJson(path.join(CHECKS, 'contrast.pairs.json'));
  // The required roles, declared in one place: every leaf of base/roles.tokens.json.
  const required = leafPaths(readJson(path.join(root, 'base/roles.tokens.json')));
  const brandsDir = path.join(root, 'brands');
  const brands = fs.readdirSync(brandsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const optOuts = new Map(); // "brand/mode" -> valid opt-outs
  const results = []; // { brand, mode, rows } in build order

  return {
    brands,

    /** Lock list: a brand folder may only set the paths its lock list unlocks. */
    locks() {
      const bad = [];
      for (const name of brands) {
        const dir = path.join(brandsDir, name);
        const own = tokenFiles(dir), files = [...own, ...tokenFiles(path.join(dir, 'modes'))];
        const declared = own.map((f) => ext(readJson(f))).reduce((a, b) => ({ ...a, ...b }), {});
        if (!Array.isArray(declared.modes) || !declared.modes.length) bad.push(`brand: brand ${name}: brand.tokens.json must list its modes in $extensions.com.orrery.modes`);
        const unlocked = declared.unlocked ?? schema.defaultUnlocked;
        if (!Array.isArray(unlocked) || unlocked.some((u) => typeof u !== 'string')) { bad.push(`lock: brand ${name}: $extensions.com.orrery.unlocked must be a list of paths`); continue; }
        for (const f of files) {
          for (const p of setPaths(readJson(f))) {
            if (!unlocks(unlocked, p)) bad.push(`lock: brand ${name} sets locked path ${p} in ${path.relative(dir, f)} (it may set: ${unlocked.join(', ') || 'nothing'})`);
          }
        }
      }
      return bad;
    },

    /** Opt-outs and required roles, on each mode's merged document, before it is resolved. A role the brand opted out of is dropped from that brand. */
    source(b) {
      const bad = new Set();
      for (const m of b.modes) {
        const o = readOptOuts(m.doc, b.name, { schema, pairs, required });
        o.bad.forEach((line) => bad.add(line));
        optOuts.set(`${b.name}/${m.id}`, o.list);
        const dropped = o.list.filter((x) => x.check === undefined).map((x) => x.role);
        for (const role of required) {
          if (dropped.includes(role)) {
            const keys = role.split('.'), leaf = keys.pop();
            delete at(m.doc, keys.join('.'))?.[leaf];
          } else if (at(m.doc, role)?.$value === undefined) bad.add(`required role: brand ${b.name}, mode ${m.id}: ${role} is missing`);
        }
      }
      return [...bad];
    },

    /** Contrast of every declared pair in one resolved mode. */
    contrast(b, m) {
      const bad = [], rows = [];
      const outs = optOuts.get(`${b.name}/${m.id}`).filter((o) => o.check === 'contrast' && (o.mode === undefined || o.mode === m.id));
      for (const p of pairs.pairs) {
        const fg = m.tokens[p.role]?.value, bg = m.tokens[p.surface]?.value;
        if (!fg || !bg) continue; // a role this brand opted out of
        const where = `brand ${b.name}, mode ${m.id}: ${p.role} on ${p.surface}`;
        if (fg.colorSpace !== 'srgb' || bg.colorSpace !== 'srgb') { bad.push(`contrast: ${where} cannot be measured: only srgb colors are supported`); continue; }
        const ratio = contrastRatio(fg, bg), needs = pairs.required[p.kind];
        const optOut = outs.find((o) => o.role === undefined || (o.role === p.role && o.surface === p.surface));
        const pass = ratio >= needs;
        rows.push({ ...p, ratio, needs, pass, optOut });
        if (!pass && !optOut) bad.push(`contrast: ${where} is ${two(ratio)}:1, needs ${needs}:1 (${p.kind})`);
      }
      results.push({ brand: b.name, mode: m.id, rows });
      return bad;
    },

    /** The generated report: every opt-out in force and every pair's measured ratio, per brand and mode. */
    report() {
      const L = ['# Token checks', '', 'Generated by npm run tokens:build from tokens/. Do not edit.', '', '## Opt-outs', ''];
      const names = [...new Set(results.map((r) => r.brand))];
      const outs = names.flatMap((brand) => {
        const seen = new Map();
        for (const [k, list] of optOuts) if (k.startsWith(`${brand}/`)) for (const o of list) seen.set(o.label, o.reason);
        return [...seen].map(([label, reason]) => `- brand ${brand}: ${label}: ${reason}`);
      });
      L.push(...(outs.length ? outs : ['None.']), '', `## Contrast (WCAG 2.2 AA: ${Object.entries(pairs.required).map(([k, v]) => `${k} ${v}:1`).join(', ')})`);
      for (const brand of names) {
        const modes = results.filter((r) => r.brand === brand);
        L.push('', `### Brand ${brand}`, '', `| Role | On | Kind | Needs | ${modes.map((r) => r.mode).join(' | ')} |`, `| --- | --- | --- | --- | ${modes.map(() => '---').join(' | ')} |`);
        for (const p of pairs.pairs) {
          const cells = modes.map((r) => {
            const row = r.rows.find((x) => x.role === p.role && x.surface === p.surface);
            if (!row) return 'opted out';
            return `${two(row.ratio)}${row.pass ? '' : ' FAILS, opted out'}`;
          });
          L.push(`| ${p.role} | ${p.surface} | ${p.kind} | ${pairs.required[p.kind]} | ${cells.join(' | ')} |`);
        }
      }
      return L.join('\n') + '\n';
    },
  };
}
