// The DESIGN.md gate. DESIGN.md holds judgement and names tokens; code holds every value. This returns failure lines (none when it passes) for:
//   1. a name DESIGN.md writes in code formatting that does not exist in the code it comes from, and
//   2. a literal value written into DESIGN.md.
// Names read (backticks only, inline or fenced):
//   - `--custom-property`: declared or read in tokens/generated/css/*.css or src/styles.module.css, or written by a string in src/*.ts(x). A name ending in "-" is a prefix and is skipped.
//   - `token.path`: a lowercase dotted path (color.accent, target.hit-target-min) in the token source under tokens/base and tokens/brands. A group counts, a file name (motion.ts) does not.
//   - `SCREAMING_SNAKE`: a named export of src/ (DEFAULT_OPEN_SPRING).
// Literals read, outside the "Values not yet in code" section: a hex colour, an rgb/hsl/oklch/oklab/lab/lch/hwb function, and a number with px or ms, negative included.
// The one escape: <!-- allow-literal: reason --> on the same line excuses that line's px and ms numbers (never a colour). It is for a sentence that needs the number to read as a principle.
// A marker with no reason, or on a line with no px or ms number, is itself a failure, so a stale marker cannot sit there.
import fs from 'node:fs';
import path from 'node:path';
import { REPO, loadBrand } from './source.mjs';

export const SECTION = 'Values not yet in code';
const FILE_EXT = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'css', 'md', 'html', 'png', 'svg', 'py', 'swift', 'yml']);
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const COLOR_FN = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/g;
const UNIT = /(?:(?<![\w.#])-|(?<![\w.#-]))\d+(?:\.\d+)?\s?(?:px|ms)\b/g;
const MARKER = /<!--\s*allow-literal:([^>]*?)-->/;
const MARKERS = /<!--[\s\S]*?-->/g;

const walk = (dir, ok) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter((f) => ok(f)).map((f) => path.join(dir, f)).filter((f) => fs.statSync(f).isFile()) : []);
const read = (f) => fs.readFileSync(f, 'utf8');
const stripCss = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');

/** What the code defines: custom property names, token paths, and src/ export names. */
export function designMdFacts(root = REPO) {
  const vars = new Set(), paths = new Set(), exports = new Set();
  const cssFiles = [...walk(path.join(root, 'tokens/generated/css'), (f) => f.endsWith('.css')), path.join(root, 'src/styles.module.css')].filter((f) => fs.existsSync(f));
  for (const f of cssFiles) for (const m of stripCss(read(f)).matchAll(/--[a-z][a-z0-9-]*/g)) vars.add(m[0]);
  const srcFiles = walk(path.join(root, 'src'), (f) => /\.tsx?$/.test(f) && !/\.test(-d)?\.tsx?$/.test(f));
  for (const f of srcFiles) {
    const text = read(f);
    for (const m of text.matchAll(/["'`](--[a-z][a-z0-9-]*)/g)) vars.add(m[1]);
    for (const m of text.matchAll(/^export\s+(?:declare\s+)?(?:const|let|function|class|enum|type|interface)\s+([A-Za-z_$][\w$]*)/gm)) exports.add(m[1]);
  }
  const tokensRoot = path.join(root, 'tokens');
  const brandsDir = path.join(tokensRoot, 'brands');
  const collect = (node, prefix) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$') || !v || typeof v !== 'object' || Array.isArray(v)) continue;
      const p = prefix ? `${prefix}.${k}` : k;
      paths.add(p);
      collect(v, p);
    }
  };
  for (const brand of fs.existsSync(brandsDir) ? fs.readdirSync(brandsDir) : []) {
    if (!fs.statSync(path.join(brandsDir, brand)).isDirectory()) continue;
    for (const mode of loadBrand(brand, null, tokensRoot).modes) collect(mode.doc, '');
  }
  return { vars, paths, exports };
}

/** Backticked code in a line: [{ text }]. `fenced` is whether the line sits inside a fenced block. */
function codeSpans(line, fenced) {
  if (fenced) return [line];
  return [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

/** Failure lines for DESIGN.md's text. `root` is the repo (a test passes a temp copy). */
export function designMdGate(text, { root = REPO, facts = designMdFacts(root), file = 'DESIGN.md' } = {}) {
  const bad = [];
  const lines = text.split('\n');
  let fenced = false, inSection = false;
  lines.forEach((raw, i) => {
    const at = `${file}:${i + 1}`;
    if (/^```/.test(raw)) { fenced = !fenced; return; }
    const heading = /^#{1,6}\s+(.*)$/.exec(raw);
    if (!fenced && heading) inSection = heading[1].trim().replace(/[*_`]/g, '').toLowerCase() === SECTION.toLowerCase();
    const line = raw.replace(MARKERS, ' ');

    for (const span of codeSpans(line, fenced)) {
      for (const m of span.matchAll(/--[a-z][a-z0-9-]*/g)) {
        if (m[0].endsWith('-') || span[m.index + m[0].length] === '*') continue;
        if (!facts.vars.has(m[0])) bad.push(`${at}: \`${m[0]}\` is not defined in tokens/generated/css, src/styles.module.css or src/*.ts(x); rename it in DESIGN.md or add the token.`);
      }
      if (fenced) continue;
      const t = span.trim().replace(/^\{(.*)\}$/, '$1');
      if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/.test(t) && !FILE_EXT.has(t.split('.').pop())) {
        if (!facts.paths.has(t)) bad.push(`${at}: token path \`${t}\` is not in the token source under tokens/base or tokens/brands; rename it in DESIGN.md or add the token.`);
      } else if (/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(t) && !facts.exports.has(t)) {
        bad.push(`${at}: \`${t}\` is not exported from src/; rename it in DESIGN.md or export it from the code that owns the value.`);
      }
    }

    const marker = MARKER.exec(raw);
    const units = inSection ? [] : line.match(UNIT) ?? [];
    if (marker) {
      if (!/[A-Za-z]{3,}/.test(marker[1])) bad.push(`${at}: allow-literal needs a reason, a word of 3 or more letters.`);
      else if (!units.length) bad.push(`${at}: allow-literal excuses nothing: this line has no px or ms number (stale marker); remove it.`);
    }
    if (inSection) return;
    for (const lit of [...(line.match(HEX) ?? []), ...(line.match(COLOR_FN) ?? []).map((f) => `${f}...)`)]) {
      bad.push(`${at}: literal colour ${lit}; DESIGN.md names tokens and holds no values. Name the variable that owns it, or list it under "${SECTION}".`);
    }
    if (!marker) {
      for (const lit of units) bad.push(`${at}: literal ${lit.replace(/\s/g, '')}; DESIGN.md names tokens and holds no values. Name the variable or export that owns it, list it under "${SECTION}", or, if the sentence needs the number to read as a principle, add <!-- allow-literal: reason --> to the line.`);
    }
  });
  return bad;
}
