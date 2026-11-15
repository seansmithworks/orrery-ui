#!/usr/bin/env node
// node tokens/rules/check-source.mjs [--only <rule-id>[,<rule-id>...]] <file-or-dir>...   (npm run rules:check -- <paths>)
// Source-level rules for the kit and the package CSS. Prints `file:line rule-id message` per violation, exits 1 if any.
// JS, TS, JSX and TSX are parsed with the repo's TypeScript (a devDependency; parse only, no program, no type checking), and the rules
// walk the syntax tree. A file TypeScript cannot parse is a `parse-error` finding, never a silent pass. CSS and HTML are still text
// scanned: the CSS reader splits on { } ; and tracks parentheses and strings. Every rule takes the paths it is given and nothing else.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

let ts;
try {
  ts = (await import('typescript')).default;
} catch (e) {
  console.error(`rules:check: cannot load the typescript package (${e.code ?? e.message}); the JS, TS and TSX rules need it. Install dev dependencies (npm ci) and run again.`);
  process.exit(2);
}

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

// ---- Rules. Each takes (file, text, sf) and returns [{ line, message }]; sf is the parsed tree for a JS or TS file, else undefined.
const cssDecls = (text) => parseCss(text).flatMap((rule) => rule.decls);
const literalColor = (file, text) => cssDecls(text).flatMap(colorFindings);
const literalSpacing = (file, text) => { const scales = scaleValues(); return cssDecls(text).flatMap((d) => spacingFindings(d, scales)); };

// ---- JS, TS, JSX and TSX: the syntax tree. Walks are loops, not recursion, so deep nesting cannot overflow the stack.
const SCRIPT_KIND = { '.ts': 'TS', '.tsx': 'TSX', '.js': 'JS', '.jsx': 'JSX', '.mjs': 'JS', '.cjs': 'JS' };
const PARSE_ERROR = 'could not be parsed; source rules were not applied to this file';
/** { sf } for a file TypeScript parses cleanly; { error: line } for a syntax error, or for a parser that gave up (a stack overflow). */
function parseScript(file, text) {
  let sf;
  try {
    sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind[SCRIPT_KIND[path.extname(file)]]);
  } catch (e) {
    if (e instanceof RangeError) return { error: 1 };
    throw e;
  }
  const first = sf.parseDiagnostics[0];
  return first ? { error: lineOf(sf, first.start) } : { sf };
}
const lineOf = (sf, pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
/** Every node of the tree, in source order. */
function* nodes(sf) {
  const stack = [sf];
  while (stack.length) {
    const node = stack.pop();
    yield node;
    const kids = [];
    ts.forEachChild(node, (c) => { kids.push(c); });
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
}
/** Every comment in the file, as TypeScript's comment ranges: the trivia before each token. JSX text is text, not trivia. */
function comments(sf) {
  const found = new Map(), stack = [sf];
  while (stack.length) {
    const node = stack.pop();
    if (ts.isJSDoc(node)) continue; // its comment is also the trivia of the token after it
    if (node.kind >= ts.SyntaxKind.FirstNode) {
      const kids = node.getChildren(sf);
      for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
    } else if (node.kind !== ts.SyntaxKind.JsxText) {
      for (const r of [...(ts.getTrailingCommentRanges(sf.text, node.pos) ?? []), ...(ts.getLeadingCommentRanges(sf.text, node.pos) ?? [])]) found.set(r.pos, r);
    }
  }
  return [...found.values()].sort((a, b) => a.pos - b.pos);
}

// Inline styles: object literals in the JSX attributes style, animate, initial, exit, whileHover and whileTap (not transition).
// There is no escape in JSX: move the value into CSS (where orrery-allow exists) or pass it as a custom property (keys starting -- are never read).
// What is read: a JSX attribute with exactly one of those names (not `data-style`, not a plain assignment), whose value is an object literal,
// or an object literal inside parentheses, an `as` or `satisfies` cast, a ternary branch, a && / || / ?? side, an array element or a call
// argument. Each key: value pair (an identifier or string key) is checked like a CSS declaration (camelCase becomes kebab-case).
// A value is read when it is a string, a number (or a negated one), a template string (its ${} parts dropped), an array of those,
// a ternary or a parenthesised expression of those, or a side of && / || / ??.
// Not read: style={identifier}; member access; values computed by a call; computed keys; spreads; a cast of a single value; nested objects
// (transition inside animate); transform and translate offsets; color literals in TS outside these attributes.
const INLINE_ATTRS = new Set(['style', 'animate', 'initial', 'exit', 'whileHover', 'whileTap']);
const LOGICAL = new Set([ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]);
const isLogical = (e) => ts.isBinaryExpression(e) && LOGICAL.has(e.operatorToken.kind);
/** The object literals an attribute value holds, in source order. */
function objectsIn(expr) {
  const found = [], todo = [expr];
  while (todo.length) {
    const e = todo.pop();
    if (ts.isObjectLiteralExpression(e)) found.push(e);
    else if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression(e)) todo.push(e.expression);
    else if (ts.isConditionalExpression(e)) todo.push(e.whenFalse, e.whenTrue);
    else if (isLogical(e)) todo.push(e.right, e.left);
    else if (ts.isArrayLiteralExpression(e)) todo.push(...[...e.elements].reverse());
    else if (ts.isCallExpression(e)) todo.push(...[...e.arguments].reverse());
  }
  return found;
}
/** Every CSS string this rule can read out of a value expression, in source order. */
function literals(expr, sf) {
  const out = [], todo = [expr];
  while (todo.length) {
    const e = todo.pop();
    if (ts.isParenthesizedExpression(e)) todo.push(e.expression);
    else if (ts.isArrayLiteralExpression(e)) todo.push(...[...e.elements].reverse());
    else if (isLogical(e)) todo.push(e.right, e.left);
    else if (ts.isConditionalExpression(e)) todo.push(e.whenFalse, e.whenTrue);
    else if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) out.push(e.text);
    else if (ts.isTemplateExpression(e)) out.push([e.head.text, ...e.templateSpans.map((s) => s.literal.text)].join(' '));
    else {
      const negated = ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(e.operand);
      const num = negated ? `-${e.operand.getText(sf)}` : ts.isNumericLiteral(e) ? e.getText(sf) : null;
      if (num && /^-?\d*\.?\d+$/.test(num) && Number(num) !== 0) out.push(`${num}px`);
    }
  }
  return out;
}
function inlineStyle(file, text, sf) {
  const scales = scaleValues(), out = [];
  for (const node of nodes(sf)) {
    if (!ts.isJsxAttribute(node) || !ts.isIdentifier(node.name) || !INLINE_ATTRS.has(node.name.text)) continue;
    const expr = node.initializer && ts.isJsxExpression(node.initializer) ? node.initializer.expression : undefined;
    if (!expr) continue;
    for (const obj of objectsIn(expr)) {
      for (const p of obj.properties) {
        if (!ts.isPropertyAssignment(p) || !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) continue;
        const key = p.name.text;
        if (key.startsWith('--')) continue; // a custom property is how a value gets from component code into CSS
        const prop = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
        const line = lineOf(sf, p.name.getStart(sf));
        for (const value of literals(p.initializer, sf)) for (const v of [...colorFindings({ prop, value, line }), ...spacingFindings({ prop, value, line }, scales)]) out.push({ line: v.line, message: `inline style: ${v.message}; move it into CSS or pass it as a custom property` });
      }
    }
  }
  // JSX has no escape marker: one found in a comment (a JSX comment {/* */} included) is a finding
  for (const c of comments(sf)) {
    for (const m of text.slice(c.pos, c.end).matchAll(/orrery-allow:\s*[a-z]+(?:-[a-z]+)+\b/g)) out.push({ line: lineOf(sf, c.pos + m.index), message: 'orrery-allow is CSS-only; move the value into CSS' });
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
const emDashMessage = (what) => `em dash (${what}): write it with a comma, colon, period or parentheses`;
// CSS and HTML: comments blanked (newlines kept) so line numbers hold. CSS strings are tracked so a /* inside one is not a comment;
// a ' or " glued to the end of a word (Don't) is text, one after whitespace, an operator or a bracket opens a string.
function blankComments(text, ext) {
  let out = '', i = 0, quote = null;
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  const html = HTML_EXT.includes(ext);
  while (i < text.length) {
    const two = text.slice(i, i + 2), ch = text[i];
    if (quote) {
      if (ch === '\\') { out += text.slice(i, i + 2); i += 2; continue; }
      if (ch === quote || ch === '\n') quote = null;
      out += ch; i++;
    } else if (two === '/*') {
      const end = text.indexOf('*/', i + 2) === -1 ? text.length : text.indexOf('*/', i + 2) + 2;
      out += blank(text.slice(i, end)); i = end;
    } else if (html && text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i) === -1 ? text.length : text.indexOf('-->', i) + 3;
      out += blank(text.slice(i, end)); i = end;
    } else {
      if (!html && (ch === '"' || ch === "'") && !/[A-Za-z0-9]/.test(text[i - 1] ?? ' ')) quote = ch;
      out += ch; i++;
    }
  }
  return out;
}
// JS and TS: the text of every string, template piece, JSX text (attribute strings are strings) and regex literal. Comments are trivia,
// never nodes, so they are never read. The source text is matched, so entities and escapes count; the cooked value is checked too.
const TEXT_KINDS = new Set(['StringLiteral', 'NoSubstitutionTemplateLiteral', 'TemplateHead', 'TemplateMiddle', 'TemplateTail', 'JsxText', 'RegularExpressionLiteral'].map((k) => ts.SyntaxKind[k]));
function emDash(file, text, sf) {
  const out = [];
  if (!sf) {
    blankComments(text, path.extname(file)).split('\n').forEach((l, i) => {
      for (const m of l.matchAll(EM_DASH)) out.push({ line: i + 1, message: emDashMessage(m[0]) });
    });
    return out;
  }
  for (const node of nodes(sf)) {
    if (!TEXT_KINDS.has(node.kind)) continue;
    const start = node.getStart(sf), found = [...text.slice(start, node.end).matchAll(EM_DASH)];
    for (const m of found) out.push({ line: lineOf(sf, start + m.index), message: emDashMessage(m[0]) });
    if (!found.length && node.text.includes('—')) out.push({ line: lineOf(sf, start), message: emDashMessage('—') });
  }
  return out;
}

/** Rule id -> { exts, run }. The registry's `source-check` refs are these keys. A JS/TS rule's run gets the parsed tree as its third argument. */
export const CHECKS = {
  'literal-color': { exts: CSS_EXT, run: literalColor },
  'literal-spacing': { exts: CSS_EXT, run: literalSpacing },
  'control-min-size': { exts: CSS_EXT, run: controlMinSize },
  'inline-style-literal': { exts: ['.tsx', '.jsx'], run: inlineStyle },
  'em-dash': { exts: [...CSS_EXT, ...JS_EXT, ...HTML_EXT], run: emDash },
};

/**
 * Violations for one file's text: [{ file, line, rule, message }]. Findings excused by an orrery-allow marker go to `allowedOut` instead.
 * A JS or TS file that does not parse gives one `parse-error` finding instead of any rule's findings.
 */
export function checkText(file, text, only = Object.keys(CHECKS), allowedOut = []) {
  const ext = path.extname(file);
  const ids = only.filter((id) => CHECKS[id].exts.includes(ext));
  let sf;
  if (JS_EXT.includes(ext) && ids.length) {
    const parsed = parseScript(file, text);
    if (parsed.error) return [{ file, rule: 'parse-error', line: parsed.error, message: PARSE_ERROR }];
    sf = parsed.sf;
  }
  const all = ids.flatMap((id) => CHECKS[id].run(file, text, sf).map((v) => ({ file, rule: id, ...v })));
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
