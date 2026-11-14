#!/usr/bin/env node
// node tokens/rules/check-source.mjs [--only <rule-id>[,<rule-id>...]] <file-or-dir>...   (npm run rules:check -- <paths>)
// Source-level rules for the kit and the package CSS. Prints `file:line rule-id message` per violation, exits 1 if any.
// Dependency-free: this is plain text scanning, not a CSS or JS parser. The CSS reader splits on { } ; and tracks parentheses and
// strings; the JS reader tracks strings, template strings and comments only. A regex literal holding a quote can confuse the JS
// reader, so the em-dash rule can miss or invent a finding there. Every rule takes the paths it is given and nothing else.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CSS_EXT = ['.css'];
const JS_EXT = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
const HTML_EXT = ['.html', '.htm'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'generated']);

// ---- CSS reader. Rules with their declarations; comments blanked (newlines kept) so line numbers hold.
// A comment `/* orrery-control */` directly before a selector marks that rule as an interactive control;
// `/* orrery-hit-area: pseudo */` beside it says a pseudo-element supplies the real hit area, so the rule's own box may be small.
export function parseCss(text) {
  const rules = [], stack = [];
  let line = 1, buf = '', bufLine = 1, paren = 0, marker = { control: false, pseudo: false };
  const top = () => stack[stack.length - 1];
  const flush = () => {
    const m = /^\s*([^:\s][^:]*?)\s*:\s*([\s\S]*?)\s*$/.exec(buf);
    if (m && top()) top().decls.push({ prop: m[1].toLowerCase(), value: m[2], line: bufLine });
    buf = '';
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2) === -1 ? text.length : text.indexOf('*/', i + 2) + 2;
      const body = text.slice(i, end);
      if (!buf.trim() && /orrery-control/.test(body)) marker.control = true;
      if (!buf.trim() && /orrery-hit-area:\s*pseudo/.test(body)) marker.pseudo = true;
      for (const c of body) { if (c === '\n') { line++; if (buf.trim()) buf += '\n'; } }
      if (buf.trim()) buf += ' ';
      i = end - 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== ch && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
      if (!buf.trim()) bufLine = line;
      buf += text.slice(i, j + 1);
      i = j;
      continue;
    }
    if (ch === '\n') line++;
    if (!buf.trim() && !/\s/.test(ch)) bufLine = line;
    if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(0, paren - 1);
    if (paren === 0 && ch === '{') {
      const rule = { selector: buf.trim(), line: bufLine, control: marker.control, hitAreaPseudo: marker.pseudo, decls: [] };
      rules.push(rule);
      stack.push(rule);
      buf = '';
      marker = { control: false, pseudo: false };
    } else if (paren === 0 && ch === '}') {
      flush();
      stack.pop();
      marker = { control: false, pseudo: false };
    } else if (paren === 0 && ch === ';') {
      flush();
      marker = { control: false, pseudo: false };
    } else buf += ch;
  }
  return rules;
}

// ---- Values: literals found outside any var() fallback.
// A fallback is everything after the first top-level comma inside var(...), at any depth below it.
function scanValue(value, onToken) {
  const stack = [];
  const inFallback = () => stack.some((f) => f.fn === 'var' && f.fallback);
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"' || ch === "'") { // a string is never a color or a length
      let j = i + 1;
      while (j < value.length && value[j] !== ch) j += value[j] === '\\' ? 2 : 1;
      i = j;
    } else if (ch === '(') {
      const fn = /([a-zA-Z-]+)$/.exec(value.slice(0, i))?.[1].toLowerCase() ?? '';
      if (fn === 'url') { i = value.indexOf(')', i) === -1 ? value.length : value.indexOf(')', i); continue; }
      stack.push({ fn, fallback: false });
      if (!inFallback()) onToken({ kind: 'function', text: fn, index: i - fn.length });
    } else if (ch === ')') stack.pop();
    else if (ch === ',') { const t = stack[stack.length - 1]; if (t?.fn === 'var') t.fallback = true; }
    else if (!inFallback()) {
      const rest = value.slice(i);
      const hex = /^#[0-9a-fA-F]{3,8}\b/.exec(rest);
      const word = /^-{0,2}[a-zA-Z][a-zA-Z0-9-]*/.exec(rest);
      const px = /^(\d*\.?\d+)px\b/.exec(rest);
      const prev = value[i - 1] ?? ' ';
      const negative = prev === '-' && !/[\w.)-]/.test(value[i - 2] ?? ' ');
      const isFunction = word && value[i + word[0].length] === '(';
      if (hex) { onToken({ kind: 'hex', text: hex[0], index: i }); i += hex[0].length - 1; }
      else if (word && !isFunction && !/[\w.-]/.test(prev)) { onToken({ kind: 'word', text: word[0], index: i }); i += word[0].length - 1; }
      else if (px && (negative || !/[\w.-]/.test(prev))) { onToken({ kind: 'px', text: px[0], px: parseFloat(px[1]), index: i }); i += px[0].length - 1; }
      else if (word) i += word[0].length - 1;
    }
  }
}

const COLOR_FUNCTIONS = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']);
const NAMED = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan ' +
  'darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet ' +
  'deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush ' +
  'lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen ' +
  'linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace ' +
  'olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen ' +
  'seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen').split(' '));
// CSS system colors (Canvas, ButtonText, ...). artifact/snapshot/bundle.css uses none, so they count as literals here.
const SYSTEM = new Set('canvas canvastext linktext visitedtext activetext buttonface buttontext buttonborder field fieldtext highlight highlighttext selecteditem selecteditemtext mark marktext graytext accentcolor accentcolortext'.split(' '));
// Properties whose value can be a color. A named color is only looked for there, so `animation-name: red` is not a finding.
const COLOR_PROPS = /^(--[\w-]+|color|background(-color|-image)?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|fill|stroke|box-shadow|text-shadow|filter|backdrop-filter|caret-color|accent-color|column-rule(-color)?|text-decoration(-color)?|text-emphasis-color|scrollbar-color|mask(-[a-z-]+)?)$/;

const RADIUS_PROP = /^(border-radius|border-(top|bottom)-(left|right)-radius|border-(start|end)-(start|end)-radius)$/;
const SPACE_PROP = /^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left|outline-offset|(padding|margin|inset|scroll-padding|scroll-margin)-(top|right|bottom|left|block|inline)(-(start|end))?|scroll-padding|scroll-margin)$/;
// px values of the space and radius scales, read from the committed token output so this rule never keeps its own copy.
function scaleValues() {
  const css = fs.readFileSync(path.join(REPO, 'tokens/generated/css/orrery.css'), 'utf8');
  const scales = { space: new Map(), radius: new Map() };
  for (const m of css.matchAll(/^\s*--((space|radius)-[\w-]+):\s*(\d*\.?\d+)px;/gm)) if (!scales[m[2]].has(Number(m[3]))) scales[m[2]].set(Number(m[3]), m[1]);
  return scales;
}
// Which scale a property reads from, or null. A custom property reads the radius scale when its name says radius, else the space scale.
const scaleFor = (prop, scales) => (SPACE_PROP.test(prop) ? scales.space : RADIUS_PROP.test(prop) ? scales.radius : prop.startsWith('--') ? (/radius/.test(prop) ? scales.radius : scales.space) : null);

const lineAt = (d, t) => d.line + (d.value.slice(0, t.index).match(/\n/g)?.length ?? 0);
/** Color findings for one declaration: [{ line, message }]. `d` is { prop, value, line }. */
function colorFindings(d) {
  const out = [];
  scanValue(d.value, (t) => {
    const named = t.kind === 'word' && COLOR_PROPS.test(d.prop) && (NAMED.has(t.text.toLowerCase()) || SYSTEM.has(t.text.toLowerCase()));
    const what = t.kind === 'hex' ? t.text : t.kind === 'function' && COLOR_FUNCTIONS.has(t.text) ? `${t.text}()` : named ? t.text : null;
    if (what) out.push({ line: lineAt(d, t), message: `literal color ${what} in ${d.prop}: use a color role, with a ${t.kind === 'hex' ? 'hex' : 'literal'} only as a var() fallback` });
  });
  return out;
}
/** Spacing and radius findings for one declaration: a px value that a space or radius token already holds. */
function spacingFindings(d, scales) {
  const scale = scaleFor(d.prop, scales), out = [], seen = new Set();
  if (!scale) return out;
  scanValue(d.value, (t) => {
    if (t.kind !== 'px' || !scale.has(t.px)) return;
    const sign = d.value[t.index - 1] === '-' ? '-' : '';
    const v = { line: lineAt(d, t), message: `literal ${sign}${t.text} in ${d.prop}: use var(--${scale.get(t.px)})` };
    if (!seen.has(`${v.line} ${v.message}`)) { seen.add(`${v.line} ${v.message}`); out.push(v); }
  });
  return out;
}

// ---- Rules. Each takes (file, text) and returns [{ line, message }].
const cssDecls = (text) => parseCss(text).flatMap((rule) => rule.decls);
const literalColor = (file, text) => cssDecls(text).flatMap(colorFindings);
const literalSpacing = (file, text) => { const scales = scaleValues(); return cssDecls(text).flatMap((d) => spacingFindings(d, scales)); };

// Inline styles: style={{ ... }} in JSX/TSX. Each key: value pair is checked like a CSS declaration (camelCase keys become kebab-case).
// A string value is read as CSS; a bare number is read as px. A template string or an expression is not read.
function topLevelEntries(body) {
  const out = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i <= body.length; i++) {
    const ch = body[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch !== undefined && '([{'.includes(ch)) depth++;
    else if (ch !== undefined && ')]}'.includes(ch)) depth--;
    else if ((ch === ',' || i === body.length) && depth === 0) { out.push({ text: body.slice(start, i), at: start }); start = i + 1; }
  }
  return out;
}
function inlineStyle(file, text) {
  const clean = blankComments(text, path.extname(file)), scales = scaleValues(), out = [];
  for (const m of clean.matchAll(/style\s*=\s*\{\s*\{/g)) {
    let depth = 2, i = m.index + m[0].length, quote = null;
    const open = i;
    for (; i < clean.length && depth > 0; i++) {
      const ch = clean[i];
      if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    const body = clean.slice(open, i - 2);
    for (const e of topLevelEntries(body)) {
      const kv = /^\s*(?:([A-Za-z_$][\w$]*)|(["'])([^"']+)\2)\s*:\s*([\s\S]*?)\s*$/.exec(e.text);
      if (!kv) continue;
      const key = kv[1] ?? kv[3], raw = kv[4];
      const prop = key.startsWith('--') ? key : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      const line = clean.slice(0, open + e.at + e.text.indexOf(key)).split('\n').length;
      const str = /^(["'])([\s\S]*)\1$/.exec(raw);
      const value = str ? str[2] : /^-?\d*\.?\d+$/.test(raw) && Number(raw) !== 0 ? `${raw}px` : null;
      if (value === null) continue;
      for (const v of [...colorFindings({ prop, value, line }), ...spacingFindings({ prop, value, line }, scales)]) out.push({ line: v.line, message: `inline style: ${v.message}` });
    }
  }
  return out;
}

const HIT_FLOOR = 44;
const SIZE_PROP = /^(min-height|height|min-width|width)$/;
function controlMinSize(file, text) {
  const out = [];
  for (const rule of parseCss(text)) {
    if (!rule.control || rule.hitAreaPseudo) continue;
    for (const d of rule.decls) {
      if (!SIZE_PROP.test(d.prop)) continue;
      const m = /^(\d*\.?\d+)px$/.exec(d.value.trim());
      if (m && parseFloat(m[1]) < HIT_FLOOR) out.push({ line: d.line, message: `${d.prop}: ${d.value.trim()} on control ${rule.selector}; the hit target floor is ${HIT_FLOOR}px` });
    }
  }
  return out;
}

// Em dash, U+2014. The Artifact checker has no em dash rule in code (artifact/SKILL.md lists none either), so this is the only definition:
// the character, its HTML entities and its escapes, anywhere outside a comment.
const EM_DASH = /—|&mdash;|&#0*8212;|&#x0*2014;|\\u\{?0*2014\}?|\\0*2014(?![0-9a-fA-F])/gi;
function blankComments(text, ext) {
  let out = '', i = 0, quote = null;
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  const css = CSS_EXT.includes(ext), html = HTML_EXT.includes(ext);
  while (i < text.length) {
    const two = text.slice(i, i + 2), ch = text[i];
    if (quote) {
      if (ch === '\\') { out += text.slice(i, i + 2); i += 2; continue; }
      if (ch === quote || (ch === '\n' && quote !== '`')) quote = null;
      out += ch; i++;
    } else if (two === '/*') {
      const end = text.indexOf('*/', i + 2) === -1 ? text.length : text.indexOf('*/', i + 2) + 2;
      out += blank(text.slice(i, end)); i = end;
    } else if (two === '//' && !css && !html && text[i - 1] !== ':') {
      const end = text.indexOf('\n', i) === -1 ? text.length : text.indexOf('\n', i);
      out += blank(text.slice(i, end)); i = end;
    } else if (html && text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i) === -1 ? text.length : text.indexOf('-->', i) + 3;
      out += blank(text.slice(i, end)); i = end;
    } else {
      if (!html && (ch === '"' || ch === "'" || (ch === '`' && !css))) quote = ch;
      out += ch; i++;
    }
  }
  return out;
}
function emDash(file, text) {
  const out = [];
  blankComments(text, path.extname(file)).split('\n').forEach((l, i) => {
    for (const m of l.matchAll(EM_DASH)) out.push({ line: i + 1, message: `em dash (${m[0]}): write it with a comma, colon, period or parentheses` });
  });
  return out;
}

/** Rule id -> { exts, run }. The registry's `source-check` refs are these keys. */
export const CHECKS = {
  'literal-color': { exts: CSS_EXT, run: literalColor },
  'literal-spacing': { exts: CSS_EXT, run: literalSpacing },
  'control-min-size': { exts: CSS_EXT, run: controlMinSize },
  'inline-style-literal': { exts: ['.tsx', '.jsx'], run: inlineStyle },
  'em-dash': { exts: [...CSS_EXT, ...JS_EXT, ...HTML_EXT], run: emDash },
};

/** Violations for one file's text: [{ file, line, rule, message }]. */
export function checkText(file, text, only = Object.keys(CHECKS)) {
  const ext = path.extname(file);
  return only.filter((id) => CHECKS[id].exts.includes(ext)).flatMap((id) => CHECKS[id].run(file, text).map((v) => ({ file, rule: id, ...v })));
}

function expand(target) {
  const st = fs.statSync(target);
  if (!st.isDirectory()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (SKIP_DIRS.has(e.name) ? [] : expand(path.join(target, e.name))) : [path.join(target, e.name)]));
}

export function checkPaths(targets, only) {
  const found = [];
  for (const f of targets.flatMap(expand).sort()) {
    if (![...CSS_EXT, ...JS_EXT, ...HTML_EXT].includes(path.extname(f))) continue;
    for (const v of checkText(f, fs.readFileSync(f, 'utf8'), only)) found.push(v);
  }
  return found.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const usage = (why) => { console.error(`rules:check: ${why}\nusage: node tokens/rules/check-source.mjs [--only <rule-id>[,<rule-id>...]] <file-or-dir>...\nrules: ${Object.keys(CHECKS).join(', ')}`); process.exit(2); };
  let only;
  const targets = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--only') {
      const v = args[++i];
      if (!v || v.startsWith('--')) usage('--only needs rule ids');
      only = v.split(',');
      const unknown = only.filter((id) => !CHECKS[id]);
      if (unknown.length) usage(`unknown rule ${unknown.join(', ')}`);
    } else if (args[i].startsWith('--')) usage(`unknown flag ${args[i]}`);
    else targets.push(args[i]);
  }
  if (!targets.length) usage('no paths given');
  const supported = [...CSS_EXT, ...JS_EXT, ...HTML_EXT];
  for (const t of targets) {
    if (!fs.existsSync(t)) usage(`no such path: ${t}`);
    if (fs.statSync(t).isFile() && !supported.includes(path.extname(t))) usage(`${t} is not a file type any rule reads (${supported.join(' ')})`);
  }
  const found = checkPaths(targets, only);
  for (const v of found) console.error(`${path.relative(process.cwd(), v.file)}:${v.line} ${v.rule} ${v.message}`);
  if (found.length) process.exit(1);
  console.log(`rules:check: ${targets.length} path(s), no violations`);
}
