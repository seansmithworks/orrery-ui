// The four static scorers. Each takes a cell dir (holding solution.tsx and the `kit` symlink) and returns
// { score: 0..1, pass: boolean, details: string[] }. No model, no browser.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { REPO, prepareCell, readJson } from './common.mjs';

const RAW_CONTROLS = new Set(['button', 'input', 'textarea', 'select', 'option', 'dialog']);
const ALLOWED_IMPORTS = new Set(['react', 'react/jsx-runtime', 'react-dom', './kit']);

function parse(file) {
  const text = fs.readFileSync(file, 'utf8');
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

const walk = (node, fn, parents = []) => {
  fn(node, parents);
  ts.forEachChild(node, (c) => walk(c, fn, [...parents, node]));
};

const tagName = (el) => el.tagName.getText();
const line = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;

/** Names imported from "./kit" in this file: local name -> exported name. */
function kitImports(sf) {
  const names = new Map();
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && st.moduleSpecifier.text === './kit') {
      const nb = st.importClause?.namedBindings;
      if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) names.set(e.name.text, (e.propertyName ?? e.name).text);
    }
  }
  return names;
}

// 1. UI comes from the kit: only allowed imports, no raw HTML control where a kit component exists.
export function kitOnly(dir) {
  const sf = parse(prepareCell(dir));
  const details = [];
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && !ALLOWED_IMPORTS.has(st.moduleSpecifier.text)) {
      details.push(`${line(sf, st)} import "${st.moduleSpecifier.text}" is not the kit or React; import UI from "./kit"`);
    }
  }
  const kit = kitImports(sf);
  let kitUses = 0, raw = 0;
  walk(sf, (n) => {
    const el = ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n) ? n : null;
    if (!el) return;
    const name = tagName(el);
    if (RAW_CONTROLS.has(name)) { raw++; details.push(`${line(sf, n)} raw <${name}>; the kit has a component for it`); }
    else if (kit.has(name.split('.')[0])) kitUses++;
  });
  if (kitUses === 0) details.push('no kit component is used');
  const bad = raw + details.filter((d) => d.includes('import ')).length;
  const score = kitUses === 0 ? 0 : kitUses / (kitUses + bad);
  return { score, pass: details.length === 0, details };
}

// 2. Literal values, through the repo's own source checker (every rule that applies to .tsx).
export function literals(dir) {
  const file = prepareCell(dir);
  const r = spawnSync('node', [path.join(REPO, 'tokens/rules/check-source.mjs'), file], { cwd: REPO, encoding: 'utf8' });
  const out = `${r.stdout}${r.stderr}`.split('\n').filter((l) => l.trim());
  const findings = out.filter((l) => !l.startsWith('rules:check:'));
  if (r.status !== 0 && findings.length === 0) findings.push(out.join(' ') || `checker exited ${r.status}`);
  return { score: 1 / (1 + findings.length), pass: findings.length === 0, details: findings.map((l) => l.replace(`${dir}/`, '')) };
}

// 3. Typecheck against the real kit with the repo's compiler options.
export function typecheck(dir) {
  prepareCell(dir);
  fs.writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify({ extends: path.join(REPO, 'tsconfig.json'), include: ['solution.tsx'], compilerOptions: { rootDir: REPO, typeRoots: [path.join(REPO, 'node_modules/@types')] } }),
  );
  const r = spawnSync(path.join(REPO, 'node_modules/.bin/tsc'), ['-p', path.join(dir, 'tsconfig.json'), '--pretty', 'false'], { cwd: dir, encoding: 'utf8' });
  const errors = `${r.stdout}${r.stderr}`.split('\n').filter((l) => /error TS\d+/.test(l));
  return { score: errors.length === 0 ? 1 : 0, pass: errors.length === 0, details: errors };
}

// 4. Catalog structure: components, parts, props, enum values, required parts and props, nesting, all against kit/catalog.json.
export function catalog(dir) {
  const sf = parse(prepareCell(dir));
  const cat = readJson(path.join(REPO, 'kit/catalog.json')).components;
  const kit = kitImports(sf);
  const details = [];
  let checks = 0;
  const check = (ok, msg) => { checks++; if (!ok) details.push(msg); };
  const used = new Map(); // component -> Set of parts used

  walk(sf, (n, parents) => {
    if (!(ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n))) return;
    const full = tagName(n);
    const [local, part] = full.split('.');
    if (!kit.has(local)) return;
    const comp = kit.get(local);
    const L = line(sf, n);
    const entry = cat[comp];
    check(!!entry, `${L} ${comp} is not in the catalog`);
    if (!entry) return;
    let spec = entry;
    if (part) {
      spec = entry.parts?.[part];
      check(!!spec, `${L} ${comp}.${part} is not a part in the catalog`);
      if (!spec) return;
      if (!used.has(comp)) used.set(comp, new Set());
      used.get(comp).add(part);
      if (spec.inside) {
        const open = parents.filter((p) => ts.isJsxElement(p)).map((p) => tagName(p.openingElement));
        const anyOf = String(spec.inside).split(',').map((s) => s.trim());
        check(open.some((t) => anyOf.some((p) => t === `${local}.${p}`)), `${L} ${full} must sit inside ${anyOf.map((p) => `${local}.${p}`).join(' or ')}`);
      }
    } else {
      check(!entry.parts, `${L} ${comp} is a compound component; use its parts (${Object.keys(entry.parts ?? {}).join(', ')})`);
      if (entry.parts) return;
    }
    const props = spec.props?.properties ?? {};
    const given = new Set();
    for (const a of n.attributes.properties) {
      if (!ts.isJsxAttribute(a)) continue; // spread: cannot know
      const name = a.name.getText();
      given.add(name);
      if (name === 'className') { check(spec.className !== false && entry.className !== false, `${L} ${full} takes no className`); continue; }
      if (/^(aria-|data-)/.test(name) || ['key', 'ref', 'style', 'id', 'children', 'render'].includes(name) || /^on[A-Z]/.test(name)) continue;
      const known = name in props;
      check(known || !!spec.passthrough, `${L} ${full} has no prop "${name}" in the catalog`);
      if (known && props[name].enum && a.initializer && ts.isStringLiteral(a.initializer)) {
        check(props[name].enum.includes(a.initializer.text), `${L} ${full} ${name}="${a.initializer.text}" is not one of ${props[name].enum.join(', ')}`);
      }
    }
    for (const req of spec.props?.required ?? []) check(given.has(req) || n.attributes.properties.some(ts.isJsxSpreadAttribute), `${L} ${full} is missing required prop "${req}"`);
    const alts = spec.props?.anyOf;
    if (alts) {
      const ok = alts.some((x) => x.required?.every((r) => given.has(r))) || n.attributes.properties.some(ts.isJsxSpreadAttribute);
      check(ok, `${L} ${full} needs one of: ${alts.map((x) => x.required.join('+')).join(' | ')}`);
    }
  });
  for (const [comp, parts] of used) for (const req of cat[comp].requiredParts ?? []) check(parts.has(req), `${comp}.${req} is a required part and is missing`);
  if (checks === 0) return { score: 0, pass: false, details: ['no kit component used, nothing to check'] };
  return { score: (checks - details.length) / checks, pass: details.length === 0, details };
}
