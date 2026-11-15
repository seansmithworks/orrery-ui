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

// The escape, CSS only: `/* orrery-allow: <rule-id> <reason> */` on one line, directly before the declaration it excuses. It covers every
// finding of that rule within that one declaration. Markers stack, one per rule. A marker with an unknown rule id, with no reason (a word of
// 3+ letters), or that excuses nothing is itself a finding. JSX has no escape: move the value into CSS or pass it as a custom property.
export const ALLOWABLE = ['literal-color', 'literal-spacing'];
const ALLOW = /orrery-allow:\s*([\w-]+)[ \t]*(.*?)\s*(?:\*\/)?\s*$/;

// ---- CSS reader. Rules with their declarations; comments blanked (newlines kept) so line numbers hold.
// A comment `/* orrery-control */` directly before a selector marks that rule as an interactive control;
// `/* orrery-hit-area: pseudo */` beside it says a pseudo-element supplies the real hit area, so the rule's own box may be small.
export function parseCss(text) {
  const rules = [], stack = [];
  let line = 1, buf = '', bufLine = 1, paren = 0, marker = { control: false, pseudo: false }, allows = [];
  const orphans = [];
  const top = () => stack[stack.length - 1];
  const flush = () => {
    const m = /^\s*([^:\s][^:]*?)\s*:\s*([\s\S]*?)\s*$/.exec(buf);
    if (m && top()) top().decls.push({ prop: m[1].toLowerCase(), value: m[2], line: bufLine, allows });
    if (buf.trim()) allows = [];
    buf = '';
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2) === -1 ? text.length : text.indexOf('*/', i + 2) + 2;
      const body = text.slice(i, end);
      if (!buf.trim() && /orrery-control/.test(body)) marker.control = true;
      if (!buf.trim() && /orrery-hit-area:\s*pseudo/.test(body)) marker.pseudo = true;
      const al = !buf.trim() && !body.includes('\n') ? ALLOW.exec(body) : null;
      if (al) allows.push({ rule: al[1], reason: al[2].trim(), line });
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
      orphans.push(...allows);
      allows = [];
    } else if (paren === 0 && ch === '}') {
      flush();
      stack.pop();
      marker = { control: false, pseudo: false };
      orphans.push(...allows);
      allows = [];
    } else if (paren === 0 && ch === ';') {
      flush();
      marker = { control: false, pseudo: false };
      orphans.push(...allows);
      allows = [];
    } else buf += ch;
  }
  orphans.push(...allows);
  rules.orphans = orphans;
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
const RADIUS_SEGMENTS = ['radius', 'radii'];
const SPACE_SEGMENTS = ['pad', 'padding', 'gap', 'gutter', 'margin', 'space', 'spacing', 'inset', 'offset', 'indent'];
const customScale = (prop, scales) => { const seg = prop.slice(2).split('-'); return seg.some((x) => RADIUS_SEGMENTS.includes(x)) ? scales.radius : seg.some((x) => SPACE_SEGMENTS.includes(x)) ? scales.space : null; };
// Which scale a property reads from, or null. A custom property is only read when its NAME says spacing or radius: it reads the radius
// scale when a hyphen-separated segment of the name is radius or radii, the space scale for pad, padding, gap, gutter, margin, space, spacing, inset, offset or indent, and is skipped otherwise.
const scaleFor = (prop, scales) => (SPACE_PROP.test(prop) ? scales.space : RADIUS_PROP.test(prop) ? scales.radius : prop.startsWith('--') ? customScale(prop, scales) : null);

const declKey = (d) => `${d.line}:${d.prop}`;
const lineAt = (d, t) => d.line + (d.value.slice(0, t.index).match(/\n/g)?.length ?? 0);
/** Color findings for one declaration: [{ line, message }]. `d` is { prop, value, line }. */
function colorFindings(d) {
  const out = [];
  scanValue(d.value, (t) => {
    const named = t.kind === 'word' && COLOR_PROPS.test(d.prop) && (NAMED.has(t.text.toLowerCase()) || SYSTEM.has(t.text.toLowerCase()));
    const what = t.kind === 'hex' ? t.text : t.kind === 'function' && COLOR_FUNCTIONS.has(t.text) ? `${t.text}()` : named ? t.text : null;
    if (what) out.push({ declKey: declKey(d), line: lineAt(d, t), message: `literal color ${what} in ${d.prop}: use a color role, with a ${t.kind === 'hex' ? 'hex' : 'literal'} only as a var() fallback` });
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
    const v = { declKey: declKey(d), line: lineAt(d, t), message: `literal ${sign}${t.text} in ${d.prop}: use var(--${scale.get(t.px)})` };
    if (!seen.has(`${v.line} ${v.message}`)) { seen.add(`${v.line} ${v.message}`); out.push(v); }
  });
  return out;
}

// ---- Rules. Each takes (file, text) and returns [{ line, message }].
const cssDecls = (text) => parseCss(text).flatMap((rule) => rule.decls);
const literalColor = (file, text) => cssDecls(text).flatMap(colorFindings);
const literalSpacing = (file, text) => { const scales = scaleValues(); return cssDecls(text).flatMap((d) => spacingFindings(d, scales)); };

// Inline styles: object literals in the JSX attributes style, animate, initial, exit, whileHover and whileTap (not transition).
// There is no escape in JSX: move the value into CSS (where orrery-allow exists) or pass it as a custom property (keys starting -- are never read).
// What is read: a real attribute of a JSX tag (not `data-style`, not a plain assignment), whose value is an object literal, or an object literal
// in a ternary, && / || / ?? branch or a call argument. Each key: value pair is checked like a CSS declaration (camelCase becomes kebab-case).
// A value is read when it is a string, a bare number, a template string (its ${} parts dropped), an array of those, a ternary or a
// parenthesised expression of those, or the literal side of && / || / ??.
// Not read: style={identifier}; values computed by a call; computed keys; spreads; `as` casts; nested objects (transition inside animate);
// transform and translate offsets; color literals in TS outside these attributes.
const INLINE_ATTRS = new Set(['style', 'animate', 'initial', 'exit', 'whileHover', 'whileTap']);
const OPEN = '([{', CLOSE = ')]}';
function topLevelEntries(body) {
  const out = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i <= body.length; i++) {
    const ch = body[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch !== undefined && OPEN.includes(ch)) depth++;
    else if (ch !== undefined && CLOSE.includes(ch)) depth--;
    else if ((ch === ',' || i === body.length) && depth === 0) { out.push({ text: body.slice(start, i), at: start }); start = i + 1; }
  }
  return out;
}
/** Index of the bracket that closes the one at `open`, skipping strings, or -1. */
function closing(text, open) {
  let depth = 0, quote = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (OPEN.includes(ch)) depth++;
    else if (CLOSE.includes(ch) && --depth === 0) return i;
  }
  return -1;
}
/** Splits `raw` at its top-level occurrences of any operator in `ops`, or returns [raw]. */
function splitTop(raw, ops) {
  const parts = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (OPEN.includes(ch)) depth++;
    else if (CLOSE.includes(ch)) depth--;
    else if (depth === 0) {
      const op = ops.find((o) => raw.startsWith(o, i) && !(o === '?' && (raw[i + 1] === '?' || raw[i + 1] === '.' || raw[i - 1] === '?')));
      if (op) { parts.push(raw.slice(start, i)); start = i + op.length; i += op.length - 1; }
    }
  }
  return parts.length ? [...parts, raw.slice(start)] : [raw];
}
/** Every CSS string this rule can read out of a value expression. */
function literals(raw) {
  raw = raw.trim();
  while (raw.startsWith('(') && closing(raw, 0) === raw.length - 1) raw = raw.slice(1, -1).trim();
  if (raw.startsWith('[') && closing(raw, 0) === raw.length - 1) return topLevelEntries(raw.slice(1, -1)).flatMap((e) => literals(e.text));
  const logical = splitTop(raw, ['&&', '||', '??']);
  if (logical.length > 1) return logical.flatMap(literals);
  // a ternary: a ? b : c, nested to the right or in parentheses
  const q = splitTop(raw, ['?']);
  if (q.length > 1) {
    const rest = raw.slice(q[0].length + 1);
    let depth = 0, quote = null, nested = 0, colon = -1;
    for (let i = 0; i < rest.length && colon === -1; i++) {
      const ch = rest[i];
      if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if (OPEN.includes(ch)) depth++;
      else if (CLOSE.includes(ch)) depth--;
      else if (depth === 0 && ch === '?' && rest[i + 1] !== '?' && rest[i + 1] !== '.') nested++;
      else if (depth === 0 && ch === ':') { if (nested === 0) colon = i; else nested--; }
    }
    if (colon !== -1) return [...literals(rest.slice(0, colon)), ...literals(rest.slice(colon + 1))];
  }
  const str = /^(["'])([\s\S]*)\1$/.exec(raw);
  if (str) return [str[2]];
  const tpl = /^`([\s\S]*)`$/.exec(raw);
  if (tpl) { let out = '', depth = 0; for (let i = 0; i < tpl[1].length; i++) { if (tpl[1].startsWith('${', i)) { depth++; i++; out += ' '; } else if (depth && tpl[1][i] === '}') depth--; else if (!depth) out += tpl[1][i]; } return [out]; }
  return /^-?\d*\.?\d+$/.test(raw) && Number(raw) !== 0 ? [`${raw}px`] : [];
}
/**
 * Which positions of `clean` (comments already blanked) are code: 1 for code, 0 inside a string, the text of a template literal
 * (outside its ${ }) or a regex literal. A `<Tag` start is only a tag in code. A regex literal is recognised by what precedes the slash.
 */
function codeMask(clean) {
  const mask = new Uint8Array(clean.length);
  const REGEX_AFTER = /[(,=:[!&|?{};]$|^$|\breturn$|\btypeof$/;
  const scanCode = (i, interp) => {
    let depth = 0;
    for (; i < clean.length; i++) {
      const ch = clean[i];
      if (interp && ch === '}' && depth === 0) return i;
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if ((ch === '"' || ch === "'") && !isApostrophe(clean, i)) {
        let j = i + 1;
        while (j < clean.length && clean[j] !== ch && clean[j] !== '\n') j += clean[j] === '\\' ? 2 : 1;
        i = j;
      } else if (ch === '`') {
        i = scanTemplate(i + 1);
      } else if (ch === '/' && clean[i + 1] !== '/' && clean[i + 1] !== '*' && REGEX_AFTER.test(clean.slice(Math.max(0, i - 12), i).trimEnd())) {
        let j = i + 1, cls = false;
        while (j < clean.length && clean[j] !== '\n' && (clean[j] !== '/' || cls)) { if (clean[j] === '\\') j++; else if (clean[j] === '[') cls = true; else if (clean[j] === ']') cls = false; j++; }
        i = j;
      } else mask[i] = 1;
    }
    return i;
  };
  // from just after the opening backtick to its closing one; returns the closing backtick's index
  const scanTemplate = (i) => {
    for (; i < clean.length; i++) {
      if (clean[i] === '\\') i++;
      else if (clean[i] === '`') return i;
      else if (clean[i] === '$' && clean[i + 1] === '{') i = scanCode(i + 2, true);
    }
    return i;
  };
  scanCode(0, false);
  return mask;
}

/** Attribute value expressions { name, from, to } of every JSX tag, found by walking each `<Tag` start. */
function jsxAttributes(clean) {
  const found = [], mask = codeMask(clean);
  for (const m of clean.matchAll(/<([A-Za-z][\w.:-]*)/g)) {
    if (!mask[m.index]) continue;
    let i = m.index + m[0].length;
    while (i < clean.length) {
      while (/\s/.test(clean[i] ?? '')) i++;
      if (clean[i] === '>' || clean.startsWith('/>', i) || i >= clean.length) break;
      if (clean[i] === '{') { const e = closing(clean, i); if (e === -1) break; i = e + 1; continue; }
      const name = /^[A-Za-z_$][\w$:.-]*/.exec(clean.slice(i))?.[0];
      if (!name) break;
      i += name.length;
      while (/\s/.test(clean[i] ?? '')) i++;
      if (clean[i] !== '=') continue;
      i++;
      while (/\s/.test(clean[i] ?? '')) i++;
      if (clean[i] === '"' || clean[i] === "'") { const e = clean.indexOf(clean[i], i + 1); if (e === -1) break; i = e + 1; }
      else if (clean[i] === '{') {
        const e = closing(clean, i);
        if (e === -1) break;
        if (INLINE_ATTRS.has(name)) found.push({ name, from: i + 1, to: e });
        i = e + 1;
      } else break;
    }
  }
  return found;
}
function inlineStyle(file, text) {
  const clean = blankComments(text, path.extname(file)), scales = scaleValues(), out = [];
  // an object literal directly in the expression, or after ( ? : = , && || ??
  const objectsIn = (from, to) => {
    const found = [];
    for (let i = from; i < to; i++) {
      if (clean[i] === '"' || clean[i] === "'" || clean[i] === '`') { const q = clean[i]; for (i++; i < to && clean[i] !== q; i++) if (clean[i] === '\\') i++; continue; }
      if (clean[i] !== '{') continue;
      const before = clean.slice(from, i).trimEnd().slice(-2);
      if (before === '' || /[(?:=,\[]$/.test(before) || /(&&|\|\||\?\?)$/.test(before)) {
        const end = closing(clean, i);
        if (end === -1 || end > to) break;
        found.push([i + 1, end]);
        i = end;
      }
    }
    return found;
  };
  for (const attr of jsxAttributes(clean)) {
    for (const [from, to] of objectsIn(attr.from, attr.to)) {
      for (const e of topLevelEntries(clean.slice(from, to))) {
        const kv = /^\s*(?:([A-Za-z_$][\w$]*)|(["'])([^"']+)\2)\s*:\s*([\s\S]*?)\s*$/.exec(e.text);
        if (!kv) continue;
        const key = kv[1] ?? kv[3];
        if (key.startsWith('--')) continue; // a custom property is how a value gets from component code into CSS
        const prop = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
        const line = clean.slice(0, from + e.at + e.text.indexOf(key)).split('\n').length;
        for (const value of literals(kv[4])) for (const v of [...colorFindings({ prop, value, line }), ...spacingFindings({ prop, value, line }, scales)]) out.push({ line: v.line, message: `inline style: ${v.message}; move it into CSS or pass it as a custom property` });
      }
    }
  }
  // JSX has no escape marker: one found in a comment is a finding
  for (const m of text.matchAll(/orrery-allow:\s*[a-z]+(?:-[a-z]+)+\b/g)) {
    if (/^\s+$/.test(clean.slice(m.index, m.index + 12))) out.push({ line: text.slice(0, m.index).split('\n').length, message: 'orrery-allow is CSS-only; move the value into CSS' });
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
// A ' or " glued to the end of a word (Don't) is text; one after whitespace, an operator or a bracket opens a string.
const isApostrophe = (text, i) => /[A-Za-z0-9]/.test(text[i - 1] ?? ' ');
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
      if (!html && (ch === '`' ? !css : (ch === '"' || ch === "'") && !isApostrophe(text, i))) quote = ch;
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

/** Violations for one file's text: [{ file, line, rule, message }]. Findings excused by an orrery-allow marker go to `allowedOut` instead. */
export function checkText(file, text, only = Object.keys(CHECKS), allowedOut = []) {
  const ext = path.extname(file);
  const all = only.filter((id) => CHECKS[id].exts.includes(ext)).flatMap((id) => CHECKS[id].run(file, text).map((v) => ({ file, rule: id, ...v })));
  const marker = (line, message) => ({ file, rule: 'orrery-allow', line, message });
  if (CSS_EXT.includes(ext) && only.some((id) => ALLOWABLE.includes(id))) {
    const parsed = parseCss(text);
    for (const d of parsed.flatMap((r) => r.decls)) {
      for (const a of d.allows) {
        if (!ALLOWABLE.includes(a.rule)) { all.push(marker(a.line, `unknown rule id ${a.rule}; valid ids: ${ALLOWABLE.join(', ')}`)); continue; }
        if (!only.includes(a.rule)) continue;
        if (!/[A-Za-z]{3,}/.test(a.reason)) { all.push(marker(a.line, `orrery-allow: ${a.rule} needs a reason, a word of 3 or more letters`)); continue; }
        const mine = all.filter((f) => f.rule === a.rule && f.declKey === declKey(d));
        if (!mine.length) { all.push(marker(a.line, `unused orrery-allow: ${a.rule} excuses nothing on the next declaration (stale, wrong rule, or already compliant)`)); continue; }
        for (const f of mine) { f.allowed = a.reason; f.markerLine = a.line; }
      }
    }
    for (const a of parsed.orphans) all.push(marker(a.line, `unused orrery-allow: ${a.rule} has no declaration after it`));
  }
  allowedOut.push(...all.filter((v) => v.allowed));
  return all.filter((v) => !v.allowed);
}

function expand(target) {
  const st = fs.statSync(target);
  if (!st.isDirectory()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (SKIP_DIRS.has(e.name) ? [] : expand(path.join(target, e.name))) : [path.join(target, e.name)]));
}

export function checkPaths(targets, only, allowedOut = []) {
  const found = [];
  for (const f of targets.flatMap(expand).sort()) {
    if (![...CSS_EXT, ...JS_EXT, ...HTML_EXT].includes(path.extname(f))) continue;
    for (const v of checkText(f, fs.readFileSync(f, 'utf8'), only, allowedOut)) found.push(v);
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
  const allowed = [];
  const found = checkPaths(targets, only, allowed);
  const excused = `${allowed.length} allowed exception(s)`;
  for (const v of found) console.error(`${path.relative(process.cwd(), v.file)}:${v.line} ${v.rule} ${v.message}`);
  allowed.sort((a, b) => (a.file === b.file ? a.markerLine - b.markerLine : a.file < b.file ? -1 : 1));
  for (const v of allowed) console.log(`${path.relative(process.cwd(), v.file)}:${v.markerLine} ${v.rule} allowed (finding at line ${v.line}): ${v.allowed}`);
  if (found.length) { console.error(`rules:check: ${found.length} violation(s), ${excused}`); process.exit(1); }
  console.log(`rules:check: ${targets.length} path(s), no violations, ${excused}`);
}
