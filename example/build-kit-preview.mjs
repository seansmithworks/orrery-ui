#!/usr/bin/env node
// npm run kit-preview:build: writes example/kit-preview.css, the specimen's forced hover, pressed and focus states.
// npm run kit-preview:check: fails when the committed file differs from a fresh build.
//
// The shipped kit CSS holds only real pseudo-classes. The specimen (example/kit.html) still has to show those
// states without a pointer or keyboard, so this reads kit/kit.css, follows its @imports in order, and repeats
// every rule whose selector uses :hover, :active or :focus-visible with that pseudo-class swapped for
// [data-preview~="hover" | "active" | "focus"]. The rest of the selector (its exclusions), the declarations
// and the enclosing @layer and @media are copied as they are. A pseudo-class and an attribute selector weigh
// the same, so specificity is unchanged, and rules keep their source order. Nothing under kit/ references the
// output; the specimen loads it after kit/kit.css.
//
// Every pseudo-class in a kit selector is decided in the STATES and PASS tables below. The generator throws, naming the file
// and the selector, on anything it cannot translate: a pseudo-class not in the table, a translated state inside
// :not() or :is() (negated or grouped state), and a state rule nested in another rule or inside an at-rule it
// does not descend into. A rule is never dropped silently.
//
// Options (for the seeded-failure test): --kit <path to kit.css>, --out <path to the preview file>.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..');
export const KIT_ENTRY = path.join(REPO, 'kit', 'kit.css');
export const OUT = path.join(HERE, 'kit-preview.css');

// Pseudo-class table. STATES: the state is forced in the specimen through [data-preview~="..."].
// PASS: kept as written, no twin, because it is not a user-action or input state.
// A pseudo-class in neither list (:focus, :focus-within, :disabled, :visited, :checked ...) throws.
const STATES = { hover: 'hover', active: 'active', 'focus-visible': 'focus' };
const PASS = {
  root: 'document-level scope for custom properties, not a state',
  not: 'attribute exclusions only; its arguments are scanned, and a state inside it throws',
  is: 'grouping only; its arguments are scanned, and a state inside it throws',
};

/**
 * Scans one selector. Returns { out, hasState }: the selector with each state swapped for its preview attribute.
 * nested: the selector sits inside another rule or an at-rule the generator does not descend into, so any state throws.
 */
function scanSelector(sel, fail, nested = false) {
  let hasState = false;
  const walk = (text, depth) => {
    let out = '';
    for (let i = 0; i < text.length; ) {
      const c = text[i];
      if (c === '\\') {
        out += text.slice(i, i + 2);
        i += 2;
      } else if (c === '[' || c === '"' || c === "'") {
        const close = c === '[' ? ']' : c;
        let j = i + 1;
        while (j < text.length && text[j] !== close) j += text[j] === '\\' ? 2 : 1;
        out += text.slice(i, j + 1);
        i = j + 1;
      } else if (c === ':') {
        const element = text[i + 1] === ':';
        const m = /^[\w-]+/.exec(text.slice(i + (element ? 2 : 1)));
        if (!m) fail(sel, 'a ":" with no pseudo-class name');
        const name = m[0];
        let end = i + (element ? 2 : 1) + name.length;
        let args = null;
        if (text[end] === '(') {
          let d = 0;
          let j = end;
          for (; j < text.length; j++) {
            if (text[j] === '(') d++;
            else if (text[j] === ')' && --d === 0) break;
          }
          args = text.slice(end + 1, j);
          end = j + 1;
        }
        if (element) {
          out += text.slice(i, end);
        } else if (name in STATES) {
          if (depth) fail(sel, `:${name} inside a functional pseudo-class (negated or grouped state) cannot be translated`);
          if (nested) fail(sel, `:${name} in a nested rule or an unknown at-rule cannot be translated`);
          hasState = true;
          out += `[data-preview~="${STATES[name]}"]`;
        } else if (name in PASS) {
          out += `:${name}${args === null ? '' : `(${walk(args, depth + 1)})`}`;
        } else {
          fail(sel, `:${name} is not in the pseudo-class table (translate or pass it on purpose)`);
        }
        i = end;
      } else {
        out += c;
        i++;
      }
    }
    return out;
  };
  return { out: walk(sel, 0), hasState };
}

/** The preludes (text before each "{") inside a rule or at-rule body, at any depth. */
function innerPreludes(body) {
  const out = [];
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '{') {
      out.push(body.slice(start, i).trim());
      start = i + 1;
    } else if (body[i] === ';' || body[i] === '}') {
      start = i + 1;
    }
  }
  return out;
}

/** CSS text, comments removed, as a tree of { prelude, children } blocks, { prelude, body } rules and ';' statements. */
function parse(text) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, '');
  let i = 0;
  const block = () => {
    const out = [];
    let start = i;
    while (i < src.length) {
      const c = src[i];
      if (c === ';') {
        const stmt = src.slice(start, i).trim();
        if (stmt) out.push({ statement: stmt });
        start = ++i;
      } else if (c === '{') {
        const prelude = src.slice(start, i).trim();
        i++;
        if (/^@(media|layer|supports|container)\b/.test(prelude)) {
          out.push({ prelude, children: block() });
        } else {
          // A style rule or @keyframes: keep the body as text, up to its matching brace.
          let depth = 1;
          const bodyStart = i;
          while (depth) {
            if (i >= src.length) throw new Error(`unclosed block after "${prelude}"`);
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            i++;
          }
          out.push({ prelude, body: src.slice(bodyStart, i - 1) });
        }
        start = i;
      } else if (c === '}') {
        i++;
        return out;
      } else {
        i++;
      }
    }
    return out;
  };
  return block();
}

/** Splits a selector list on its top-level commas. */
function splitSelectors(list) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === '(') depth++;
    else if (list[i] === ')') depth--;
    else if (list[i] === ',' && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts.map((s) => s.replace(/\s+/g, ' ').trim());
}

/** The preview twin of a parsed tree: only state rules, inside their at-rules, in source order. */
function previewNodes(nodes, label) {
  const out = [];
  for (const n of nodes) {
    if (n.children) {
      const kids = previewNodes(n.children, label);
      if (kids.length) out.push({ prelude: n.prelude, children: kids });
    } else if (n.body !== undefined) {
      // Rules nested in this body (CSS nesting, or the contents of an at-rule that is not descended into).
      for (const inner of innerPreludes(n.body)) {
        if (inner.startsWith('@')) continue;
        const fail = (sel, why) => {
          throw new Error(`kit-preview: ${label}: selector "${sel}" inside "${n.prelude}": ${why}`);
        };
        for (const sel of splitSelectors(inner)) scanSelector(sel, fail, true);
      }
      if (n.prelude.startsWith('@')) continue;
      const fail = (sel, why) => {
        throw new Error(`kit-preview: ${label}: selector "${sel}": ${why}`);
      };
      const selectors = splitSelectors(n.prelude)
        .map((sel) => scanSelector(sel, fail))
        .filter((r) => r.hasState)
        .map((r) => r.out);
      if (selectors.length) out.push({ selectors, body: n.body });
    }
  }
  return out;
}

function print(nodes, indent) {
  const pad = '  '.repeat(indent);
  const lines = [];
  for (const n of nodes) {
    if (n.children) {
      lines.push(`${pad}${n.prelude.replace(/\s+/g, ' ')} {`, ...print(n.children, indent + 1), `${pad}}`);
    } else {
      lines.push(`${pad}${n.selectors.join(`,\n${pad}`)} {`);
      for (const d of n.body.split('\n').map((l) => l.trim()).filter(Boolean)) lines.push(`${pad}  ${d}`);
      lines.push(`${pad}}`);
    }
  }
  return lines;
}

/** The kit's files in cascade order: each @import (recursively) before the importing file's own rules. */
function sources(entry) {
  const out = [];
  const visit = (file) => {
    const tree = parse(fs.readFileSync(file, 'utf8'));
    for (const n of tree) {
      const m = n.statement?.match(/^@import\s+(?:url\()?["']([^"']+)["']\)?/);
      if (m) visit(path.resolve(path.dirname(file), m[1]));
    }
    out.push({ file, tree });
  };
  visit(entry);
  return out;
}

export function buildPreview(entry = KIT_ENTRY) {
  const root = path.dirname(path.dirname(entry));
  const parts = [
    '/* GENERATED by example/build-kit-preview.mjs from kit/kit.css. Do not edit: run npm run kit-preview:build.',
    '   Specimen only, never shipped. Every :hover, :active and :focus-visible rule in the kit, repeated for',
    '   [data-preview~="hover" | "active" | "focus"] with the same exclusions, at-rules and specificity, in source',
    '   order. Load it after kit/kit.css. */',
  ];
  for (const { file, tree } of sources(entry)) {
    const label = path.relative(root, file).split(path.sep).join('/');
    const nodes = previewNodes(tree, label);
    if (!nodes.length) continue;
    parts.push('', `/* ${label} */`, ...print(nodes, 0));
  }
  return `${parts.join('\n')}\n`;
}

/** Problems with the committed file: empty when it equals a fresh build. */
export function checkPreview(entry = KIT_ENTRY, out = OUT) {
  const fresh = buildPreview(entry);
  const committed = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
  if (committed === fresh) return [];
  return [
    committed === null
      ? `kit-preview: ${path.relative(REPO, out)} is missing`
      : `kit-preview: ${path.relative(REPO, out)} differs from a fresh build of the kit's state rules`,
  ];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name, dflt) => {
    const at = args.indexOf(name);
    return at === -1 ? dflt : path.resolve(args[at + 1]);
  };
  const entry = opt('--kit', KIT_ENTRY);
  const out = opt('--out', OUT);
  if (args.includes('--check')) {
    const problems = checkPreview(entry, out);
    if (problems.length) {
      console.error(`${problems.join('\n')}\nrun npm run kit-preview:build and commit the result`);
      process.exit(1);
    }
    console.log(`kit-preview:check: ${path.relative(REPO, out)} matches the kit`);
  } else {
    fs.writeFileSync(out, buildPreview(entry));
    console.log(`kit-preview:build: wrote ${path.relative(REPO, out)}`);
  }
}
