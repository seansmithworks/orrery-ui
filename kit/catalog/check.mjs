#!/usr/bin/env node
// npm run catalog:check: the kit catalog (kit/<folder>/<folder>.catalog.json and the built kit/catalog.json) against the real components.
// One TypeScript program rooted at kit/index.ts, with the type checker, so Pick, Omit, intersections and aliases resolve as the compiler
// sees them. Every *Problems function returns failure lines and writes nothing; `root` is the repo (a seeded test passes a temp copy).
//   1. coverage   every value export of kit/index.ts has one entry, in its own folder's catalog file; every component folder has one.
//   2. props      every kit-owned prop (declared under kit/) is listed; every listed prop exists; type, enum and optionality match.
//   3. defaults   a stated default equals the destructuring initializer in the component function, and every initializer is stated.
//   4. parts      a compound entry's parts are exactly the compound object's members; inside and requiredParts name real parts.
//   5. example    the folder's golden example exists, default-exports a component, imports the kit only from "../index", and uses
//                 every component in its folder and every required part.
//   6. prose      length and count limits, `instead` resolves, and the repo's em-dash rule over the JSON text.
//   7. aggregate  kit/catalog.json equals what kit/catalog/build.mjs builds from the folder files.
// The schema is defined here (no JSON Schema validator): schemaProblems rejects any key or value shape this file does not know.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { CHECKS } from '../../tokens/rules/check-source.mjs';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const AGGREGATE = 'kit/catalog.json';
const TF = ts.TypeFlags;

export const LIMITS = { description: 140, propDescription: 140, item: 120, items: 4 };
const JSON_TYPES = ['string', 'boolean', 'number'];
// Values JSON cannot carry. object: a DOM node, a ref, or another object that is not a React element.
const X_TYPES = ['node', 'element', 'function', 'object'];
const ENTRY_KEYS = ['description', 'props', 'extends', 'passthrough', 'slots', 'parts', 'requiredParts', 'useWhen', 'avoidWhen', 'a11y', 'className'];
const PART_KEYS = [...ENTRY_KEYS.filter((k) => !['parts', 'requiredParts'].includes(k)), 'inside'];
// A native element an `instead` may point to.
const TAGS = new Set(('a abbr address area article aside audio b blockquote br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt ' +
  'em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li main map mark menu meter nav noscript object ol ' +
  'optgroup option output p picture pre progress q s samp search section select slot small source span strong sub summary sup table tbody td template textarea tfoot th thead ' +
  'time tr track u ul var video wbr').split(' '));

const rel = (root, f) => path.relative(root, f).split(path.sep).join('/');
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const sameSet = (a, b) => a.length === b.length && [...a].sort().join('\0') === [...b].sort().join('\0');
const list = (xs) => (xs.length ? xs.join(', ') : '(none)');

// ---- The catalog on disk.

/** Folders under kit/ that hold a component: a .tsx file that is not a test or an example. */
export function componentFolders(root = REPO) {
  const kit = path.join(root, 'kit');
  return fs.readdirSync(kit, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.readdirSync(path.join(kit, d.name)).some((f) => f.endsWith('.tsx') && !/\.(test|example)\.tsx$/.test(f)))
    .map((d) => d.name).sort();
}

/** Every kit/<folder>/<folder>.catalog.json: [{ folder, file, text, data, error? }]. */
export function loadCatalog(root = REPO) {
  const kit = path.join(root, 'kit');
  const out = [];
  for (const d of fs.readdirSync(kit, { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name).sort()) {
    for (const f of fs.readdirSync(path.join(kit, d)).filter((x) => x.endsWith('.catalog.json')).sort()) {
      const file = `kit/${d}/${f}`, text = fs.readFileSync(path.join(kit, d, f), 'utf8');
      try { out.push({ folder: d, file, text, data: JSON.parse(text) }); } catch (e) { out.push({ folder: d, file, text, data: null, error: e.message.split('\n')[0] }); }
    }
  }
  return out;
}

/** name -> { folder, file, entry } for every top-level entry. */
const entriesOf = (catalog) => {
  const m = new Map();
  for (const c of catalog) if (isObj(c.data?.components)) for (const [name, entry] of Object.entries(c.data.components)) if (!m.has(name)) m.set(name, { ...c, entry });
  return m;
};

// ---- The kit, as the type checker sees it.

const PASSTHROUGH_FILE = 'kit/__catalog_passthrough__.ts';
const passthroughRefs = (catalog) => {
  const refs = new Set();
  const visit = (e) => { if (typeof e?.passthrough === 'string') refs.add(e.passthrough); if (isObj(e?.parts)) Object.values(e.parts).forEach(visit); };
  for (const { entry } of entriesOf(catalog).values()) visit(entry);
  return [...refs].sort();
};

/**
 * One program rooted at kit/index.ts. Each catalog `passthrough` ("<module>#<type>") is resolved through a virtual file that imports it,
 * so the check sees exactly the type a consumer would. Returns the model the checks read.
 */
export function readKit(catalog, root = REPO) {
  const cfg = ts.getParsedCommandLineOfConfigFile(path.join(root, 'tsconfig.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic() {} });
  const refs = passthroughRefs(catalog);
  const virtualPath = path.join(root, PASSTHROUGH_FILE);
  const virtualText = refs.map((r, i) => { const [mod, type] = r.split('#'); return `import type * as M${i} from ${JSON.stringify(mod)};\nexport type T${i} = M${i}.${type};\n`; }).join('');
  const host = ts.createCompilerHost(cfg.options);
  const { getSourceFile, fileExists, readFile } = host;
  host.getSourceFile = (f, ...a) => (path.resolve(f) === virtualPath ? ts.createSourceFile(f, virtualText, ts.ScriptTarget.Latest, true) : getSourceFile.call(host, f, ...a));
  host.fileExists = (f) => path.resolve(f) === virtualPath || fileExists.call(host, f);
  host.readFile = (f) => (path.resolve(f) === virtualPath ? virtualText : readFile.call(host, f));
  const index = path.join(root, 'kit/index.ts');
  const program = ts.createProgram([index, virtualPath], cfg.options, host);
  const checker = program.getTypeChecker();
  const kitDir = path.join(root, 'kit') + path.sep;
  const underKit = (s) => (s.declarations ?? []).some((d) => d.getSourceFile().fileName.startsWith(kitDir) || path.resolve(d.getSourceFile().fileName).startsWith(kitDir));

  // Passthrough types: ref -> { props: Set<name> } or { error }.
  const vsf = program.getSourceFile(virtualPath);
  const diags = program.getSemanticDiagnostics(vsf);
  const passthrough = new Map();
  refs.forEach((r, i) => {
    const decl = vsf.statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === `T${i}`);
    const start = decl.getStart(vsf), bad = diags.find((d) => d.start >= start && d.start < decl.end);
    if (bad) passthrough.set(r, { error: ts.flattenDiagnosticMessageText(bad.messageText, ' ') });
    else { const t = checker.getTypeAtLocation(decl.name); passthrough.set(r, { props: new Set(propsByConstituent(checker, t).flatMap((c) => [...c.keys()])) }); }
  });

  /** A component's props, from its call signature: { constituents: [Map name -> { optional, type }], owned: Set, names: Set, defaults, file }. */
  const component = (type, decl) => {
    const sig = type.getCallSignatures()[0];
    const param = sig?.parameters[0];
    const props = param ? checker.getTypeOfSymbol(param) : null;
    const constituents = props ? propsByConstituent(checker, props) : [new Map()];
    const owned = new Set(), names = new Set();
    for (const c of constituents) for (const [n, p] of c) { names.add(n); if (underKit(p.symbol)) owned.add(n); }
    return { constituents, owned, names, defaults: decl ? initializers(decl) : new Map(), file: decl ? rel(root, decl.getSourceFile().fileName) : null };
  };
  // The kit function a value resolves to, if it is declared under kit/.
  const kitFunction = (type) => { const d = type.symbol?.valueDeclaration; return d && (ts.isFunctionDeclaration(d) || ts.isArrowFunction(d) || ts.isFunctionExpression(d)) && path.resolve(d.getSourceFile().fileName).startsWith(kitDir) ? d : null; };

  const exports = new Map();
  for (const e of checker.getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(index)))) {
    const s = e.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(e) : e;
    if (!(s.flags & ts.SymbolFlags.Value)) continue;
    const type = checker.getTypeOfSymbol(s);
    const declFile = s.valueDeclaration ? rel(root, s.valueDeclaration.getSourceFile().fileName) : null;
    const folder = declFile?.startsWith('kit/') ? declFile.split('/')[1] : null;
    if (type.getCallSignatures().length) exports.set(e.name, { kind: 'function', folder, ...component(type, kitFunction(type)) });
    else {
      const parts = new Map();
      for (const m of checker.getPropertiesOfType(type)) { const mt = checker.getTypeOfSymbol(m); parts.set(m.name, component(mt, kitFunction(mt))); }
      exports.set(e.name, { kind: 'compound', folder, parts });
    }
  }
  return { exports, passthrough, checker };
}

/** The props of a props type, one Map per union constituent (a non-union type is one constituent). */
function propsByConstituent(checker, type) {
  return (type.isUnion() ? type.types : [type]).map((t) => new Map(checker.getPropertiesOfType(t).map((s) => [s.name, { symbol: s, optional: !!(s.flags & ts.SymbolFlags.Optional), type: checker.getTypeOfSymbol(s) }])));
}

/** Literal initializers of the first parameter's destructuring: name -> value, or { unreadable: text }. */
function initializers(fn) {
  const out = new Map(), p = fn.parameters?.[0];
  if (!p || !ts.isObjectBindingPattern(p.name)) return out;
  for (const el of p.name.elements) {
    if (!el.initializer || el.dotDotDotToken) continue;
    const key = el.propertyName ?? el.name;
    const name = ts.isIdentifier(key) || ts.isStringLiteral(key) ? key.text : key.getText();
    const i = el.initializer;
    out.set(name, ts.isStringLiteral(i) ? i.text : ts.isNumericLiteral(i) ? Number(i.text) : i.kind === ts.SyntaxKind.TrueKeyword ? true : i.kind === ts.SyntaxKind.FalseKeyword ? false : { unreadable: i.getText() });
  }
  return out;
}

/** What a TypeScript type is, per constituent, with null and undefined dropped. */
function shapes(checker, type) {
  const t = checker.getNonNullableType(type);
  const isNode = type.aliasSymbol?.name === 'ReactNode' || t.aliasSymbol?.name === 'ReactNode';
  const out = (t.isUnion() ? t.types : [t]).map((p) => {
    const f = p.flags;
    if (f & TF.StringLiteral) return { k: 'string', lit: p.value };
    if (f & (TF.String | TF.TemplateLiteral)) return { k: 'string' };
    if (f & TF.NumberLiteral) return { k: 'number', lit: p.value };
    if (f & TF.Number) return { k: 'number' };
    if (f & (TF.Boolean | TF.BooleanLiteral)) return { k: 'boolean' };
    if (p.isIntersection() && p.types.some((x) => x.flags & TF.String)) return { k: 'string' }; // string & {}: an open string
    if (p.getCallSignatures().length) return { k: 'function' };
    if (p.symbol?.name === 'ReactElement' || p.aliasSymbol?.name === 'ReactElement') return { k: 'element' };
    return { k: 'object' };
  });
  out.node = isNode || (out.some((s) => s.k === 'element') && out.some((s) => s.k === 'string'));
  return out;
}

/** Why a listed prop's type or enum does not match the TypeScript type, or null. */
function typeMismatch(checker, decl, types) {
  const all = types.flatMap((t) => shapes(checker, t)), node = types.some((t) => shapes(checker, t).node);
  const kinds = [...new Set(all.map((s) => s.k))];
  const text = checker.typeToString(types[0]);
  // One JSON branch ({ type, enum? }) against the constituents of its kind.
  const branch = (b, of, at) => {
    const lits = of.every((s) => s.lit !== undefined) ? [...new Set(of.map((s) => s.lit))] : null;
    if (lits && b.type !== 'boolean') {
      if (!Array.isArray(b.enum)) return `${at}has no enum, but the type is the literal union ${list(lits.map(String))}`;
      if (!sameSet(b.enum.map(String), lits.map(String))) return `${at}enum is ${list(b.enum.map(String))}, but the type allows ${list(lits.map(String))}`;
    } else if (b.enum !== undefined) return `${at}has an enum, but the type ${text} is not a literal union`;
    return null;
  };
  if (decl.type) {
    if (kinds.length !== 1 || kinds[0] !== decl.type) return `type is ${decl.type}, but the component's type is ${text}`;
    return branch(decl, all, '');
  }
  if (decl.anyOf) {
    const types = decl.anyOf.map((b) => b.type);
    if (!sameSet(types, kinds)) return `anyOf types are ${list(types)}, but the type ${text} holds ${list(kinds)}`;
    for (const b of decl.anyOf) { const why = branch(b, all.filter((s) => s.k === b.type), `anyOf ${b.type} branch `); if (why) return why; }
    return null;
  }
  if (kinds.every((k) => JSON_TYPES.includes(k))) return `x-type is ${decl['x-type']}, but the type ${text} is plain JSON; use ${kinds.length === 1 ? `"type": "${kinds[0]}"` : `"anyOf": [${kinds.map((k) => `{ "type": "${k}" }`).join(', ')}]`}`;
  const want = decl['x-type'];
  const ok = want === 'node' ? node : kinds.includes(want);
  return ok ? null : `x-type is ${want}, but the type ${checker.typeToString(types[0])} holds no ${want}`;
}

// ---- 0. Schema: the shape of every folder file, entry and prop.

const items = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string' || (isObj(x) && typeof x.text === 'string' && typeof x.instead === 'string' && Object.keys(x).length === 2));
function entryShape(entry, at, part) {
  const bad = [];
  if (!isObj(entry)) return [`${at} is not an object`];
  for (const k of Object.keys(entry)) if (!(part ? PART_KEYS : ENTRY_KEYS).includes(k)) bad.push(`${at} has unknown key ${k}`);
  if (typeof entry.description !== 'string') bad.push(`${at} has no description`);
  if (entry.parts !== undefined && entry.props !== undefined) bad.push(`${at} is compound (it has parts), so props belong on its parts, not the top level`);
  if (entry.parts === undefined && !part && entry.props === undefined) bad.push(`${at} has neither props nor parts`);
  if (part && entry.props === undefined) bad.push(`${at} has no props`);
  for (const k of ['extends', 'passthrough']) if (entry[k] !== undefined && typeof entry[k] !== 'string') bad.push(`${at}.${k} must be a string`);
  if (typeof entry.passthrough === 'string' && !/^[@\w./-]+#\S.*$/.test(entry.passthrough)) bad.push(`${at}.passthrough must be <module>#<type>, e.g. @base-ui/react/button#Button.Props`);
  if (entry.className !== undefined && entry.className !== false) bad.push(`${at}.className may only be false (the component takes no className)`);
  for (const k of ['slots', 'requiredParts']) if (entry[k] !== undefined && !(Array.isArray(entry[k]) && entry[k].every((x) => typeof x === 'string'))) bad.push(`${at}.${k} must be a list of strings`);
  if (entry.inside !== undefined && !(typeof entry.inside === 'string' || (Array.isArray(entry.inside) && entry.inside.every((x) => typeof x === 'string')))) bad.push(`${at}.inside must be a part name or a list of them`);
  for (const k of ['useWhen', 'avoidWhen']) if (entry[k] !== undefined && !items(entry[k])) bad.push(`${at}.${k} must be a list of strings or { text, instead }`);
  if (entry.a11y !== undefined && !(Array.isArray(entry.a11y) && entry.a11y.every((x) => typeof x === 'string'))) bad.push(`${at}.a11y must be a list of strings`);
  if (entry.props !== undefined) bad.push(...propsShape(entry.props, `${at}.props`));
  if (entry.parts !== undefined) {
    if (!isObj(entry.parts)) bad.push(`${at}.parts must be an object`);
    else for (const [n, p] of Object.entries(entry.parts)) bad.push(...entryShape(p, `${at}.parts.${n}`, true));
  }
  return bad;
}
function propsShape(props, at) {
  const bad = [];
  if (!isObj(props) || props.type !== 'object' || !isObj(props.properties) || !Array.isArray(props.required)) return [`${at} must be { "type": "object", "properties": {}, "required": [] }`];
  for (const k of Object.keys(props)) if (!['type', 'properties', 'required', 'anyOf'].includes(k)) bad.push(`${at} has unknown key ${k}`);
  if (props.anyOf !== undefined && !(Array.isArray(props.anyOf) && props.anyOf.length > 1 && props.anyOf.every((b) => isObj(b) && Object.keys(b).length === 1 && Array.isArray(b.required)))) bad.push(`${at}.anyOf must be two or more { "required": [...] }`);
  for (const [n, p] of Object.entries(props.properties)) {
    const pa = `${at}.properties.${n}`;
    if (n === 'className') { bad.push(`${pa}: className is accepted everywhere and is never listed`); continue; }
    if (!isObj(p)) { bad.push(`${pa} is not an object`); continue; }
    // Three forms: { type, enum?, default? }, { anyOf: [{ type, enum? }, ...] } for a value that is one of several JSON types, or { x-type }.
    const form = p.type !== undefined ? 'type' : p.anyOf !== undefined ? 'anyOf' : 'x-type';
    const keys = { type: ['type', 'enum', 'default', 'description', 'x-from'], anyOf: ['anyOf', 'description', 'x-from'], 'x-type': ['x-type', 'description', 'x-from'] }[form];
    for (const k of Object.keys(p)) if (!keys.includes(k)) bad.push(`${pa} has key ${k}, which a "${form}" prop does not take`);
    if (p.type !== undefined && !JSON_TYPES.includes(p.type)) bad.push(`${pa}.type ${JSON.stringify(p.type)} is not one of ${JSON_TYPES.join(', ')}`);
    if (form === 'anyOf' && !(Array.isArray(p.anyOf) && p.anyOf.length > 1 && p.anyOf.every((b) => isObj(b) && JSON_TYPES.includes(b.type) && Object.keys(b).every((k) => ['type', 'enum'].includes(k)) && (b.enum === undefined || (Array.isArray(b.enum) && b.enum.length && b.enum.every((v) => typeof v === b.type)))) && new Set(p.anyOf.map((b) => b.type)).size === p.anyOf.length)) bad.push(`${pa}.anyOf must be two or more { "type", "enum"? } branches, one per JSON type`);
    if (form === 'x-type' && !X_TYPES.includes(p['x-type'])) bad.push(`${pa} needs "type" (${JSON_TYPES.join(', ')}), "anyOf" or "x-type" (${X_TYPES.join(', ')})`);
    if (p.enum !== undefined && !(Array.isArray(p.enum) && p.enum.length && p.enum.every((v) => typeof v === p.type))) bad.push(`${pa}.enum must be a list of ${p.type} values`);
    if (p.default !== undefined && typeof p.default !== p.type) bad.push(`${pa}.default must be a ${p.type}`);
    if (p.default !== undefined && Array.isArray(p.enum) && !p.enum.includes(p.default)) bad.push(`${pa}.default ${JSON.stringify(p.default)} is not in its enum`);
    if (typeof p.description !== 'string' || !p.description.trim()) bad.push(`${pa} has no description`);
    if (p['x-from'] !== undefined && p['x-from'] !== 'base-ui') bad.push(`${pa}.x-from may only be "base-ui"`);
  }
  for (const r of [...props.required, ...(props.anyOf ?? []).flatMap((b) => b.required ?? [])]) if (!(r in props.properties)) bad.push(`${at}: required ${r} is not in properties`);
  return bad;
}
export function schemaProblems(catalog) {
  const bad = [];
  for (const c of catalog) {
    const at = `catalog: ${c.file}`;
    if (c.error) { bad.push(`${at} is not valid JSON: ${c.error}`); continue; }
    if (!isObj(c.data)) { bad.push(`${at} must be { "example": "<File>.example.tsx", "components": {} }`); continue; }
    for (const k of Object.keys(c.data)) if (!['example', 'components'].includes(k)) bad.push(`${at} has unknown key ${k}`);
    if (typeof c.data.example !== 'string' || !c.data.example.endsWith('.example.tsx')) bad.push(`${at}: example must name a <File>.example.tsx in kit/${c.folder}/`);
    if (!isObj(c.data.components) || !Object.keys(c.data.components).length) { bad.push(`${at}: components must name at least one component`); continue; }
    for (const [n, e] of Object.entries(c.data.components)) bad.push(...entryShape(e, `${at} ${n}`, false));
  }
  return bad;
}

// ---- 1. Coverage.

export function coverageProblems(kit, catalog, root = REPO) {
  const bad = [], seen = new Map();
  for (const c of catalog) {
    if (path.basename(c.file) !== `${c.folder}.catalog.json`) bad.push(`catalog: ${c.file} should be named kit/${c.folder}/${c.folder}.catalog.json`);
    for (const name of Object.keys(c.data?.components ?? {})) {
      if (seen.has(name)) bad.push(`catalog: ${name} has an entry in both ${seen.get(name)} and ${c.file}; it needs exactly one`);
      else seen.set(name, c.file);
      const ex = kit.exports.get(name);
      if (!ex) bad.push(`catalog: ${c.file} ${name} is not a value export of kit/index.ts`);
      else if (ex.folder !== c.folder) bad.push(`catalog: ${name} is declared in kit/${ex.folder}/, so its entry belongs in kit/${ex.folder}/${ex.folder}.catalog.json, not ${c.file}`);
    }
  }
  for (const name of kit.exports.keys()) if (!seen.has(name)) bad.push(`catalog: kit/index.ts exports ${name}, which has no catalog entry`);
  const withFile = new Set(catalog.map((c) => c.folder));
  for (const f of componentFolders(root)) if (!withFile.has(f)) bad.push(`catalog: kit/${f}/ holds a component but no ${f}.catalog.json`);
  return bad;
}

// ---- 2. Props.

/** Listed props for an entry, with `extends` folded in: name -> { decl, from } where from is the entry that lists it. */
function listed(entry, entries, own) {
  const out = new Map();
  const base = entry.extends ? entries.get(entry.extends)?.entry : null;
  if (base?.props) for (const [n, d] of Object.entries(base.props.properties)) out.set(n, { decl: d, from: entry.extends });
  for (const [n, d] of Object.entries(entry.props?.properties ?? {})) out.set(n, { decl: d, from: own });
  return out;
}

function propsOne(kit, entries, at, name, entry, model) {
  const bad = [];
  if (entry.extends !== undefined) {
    const base = entries.get(entry.extends);
    if (!base) bad.push(`${at}.extends names ${entry.extends}, which has no entry`);
    else if (!base.entry.props) bad.push(`${at}.extends names ${entry.extends}, which has no props of its own`);
  }
  const props = listed(entry, entries, name);
  const hasClass = model.names.has('className');
  if (entry.className === false && hasClass) bad.push(`${at} says className: false, but the component takes className`);
  if (entry.className !== false && !hasClass) bad.push(`${at}: the component takes no className; say "className": false so the catalog does not promise one`);
  for (const n of model.owned) if (n !== 'className' && !props.has(n)) bad.push(`${at}: kit-owned prop ${n} (declared under kit/) is not listed`);
  const pt = entry.passthrough ? kit.passthrough.get(entry.passthrough) : null;
  if (pt?.error) bad.push(`${at}.passthrough ${entry.passthrough} does not resolve: ${pt.error}`);
  const forwarded = [...model.names].filter((n) => !model.owned.has(n));
  if (forwarded.length && !entry.passthrough) bad.push(`${at} forwards props it does not own (${forwarded.slice(0, 4).join(', ')}, ...), so it needs a passthrough type`);
  if (pt?.props) { const stray = forwarded.filter((n) => !pt.props.has(n)); if (stray.length) bad.push(`${at}: ${list(stray.slice(0, 6))} reach the component but are not on its passthrough ${entry.passthrough}`); }
  if (!forwarded.length && entry.passthrough) bad.push(`${at} has passthrough ${entry.passthrough}, but every prop it takes is kit-owned`);
  for (const [n, { decl }] of props) {
    const p = `${at}.props.${n}`;
    if (!model.names.has(n)) { bad.push(`${p} is listed, but the component's props type has no ${n}`); continue; }
    const owned = model.owned.has(n);
    if (owned && decl['x-from']) bad.push(`${p} is declared under kit/, so it is kit-owned and takes no x-from`);
    if (!owned && decl['x-from'] !== 'base-ui') bad.push(`${p} is not declared under kit/; mark it "x-from": "base-ui" (a listed passthrough prop)`);
    if (!owned && pt?.props && !pt.props.has(n)) bad.push(`${p} has x-from, but the passthrough ${entry.passthrough} has no ${n}`);
    const why = typeMismatch(kit.checker, decl, model.constituents.filter((c) => c.has(n)).map((c) => c.get(n).type));
    if (why) bad.push(`${p} ${why}`);
  }
  // Optionality, over listed props only: the required set of each union constituent.
  const sets = model.constituents.map((c) => [...props.keys()].filter((n) => c.has(n) && !c.get(n).optional).sort());
  const keys = [...new Set(sets.map((s) => s.join(',')))];
  const always = sets.reduce((a, s) => a.filter((x) => s.includes(x)), sets[0] ?? []);
  const required = entry.props ? entry.props.required : [];
  const inherited = entry.extends ? entries.get(entry.extends)?.entry.props?.required ?? [] : [];
  if (!sameSet([...new Set([...required, ...inherited])], always)) bad.push(`${at}.props.required is ${list([...new Set([...required, ...inherited])])}, but the type requires ${list(always)}`);
  const anyOf = entry.props?.anyOf;
  if (keys.length > 1) {
    if (!anyOf) bad.push(`${at}: the props type is a union whose members require different props (${keys.map((k) => `{${k}}`).join(' or ')}); state it as props.anyOf`);
    else if (!sameSet(anyOf.map((b) => [...b.required].sort().join(',')), keys)) bad.push(`${at}.props.anyOf is ${anyOf.map((b) => `{${b.required.join(',')}}`).join(' or ')}, but the type requires ${keys.map((k) => `{${k}}`).join(' or ')}`);
  } else if (anyOf) bad.push(`${at}.props.anyOf is stated, but the props type is not a union of different required props`);
  return bad;
}

export function propsProblems(kit, catalog) {
  const bad = [], entries = entriesOf(catalog);
  for (const [name, { file, entry }] of entries) {
    const ex = kit.exports.get(name);
    if (!ex) continue;
    const at = `catalog: ${file} ${name}`;
    if (ex.kind === 'function') bad.push(...propsOne(kit, entries, at, name, entry, ex));
    else for (const [part, pe] of Object.entries(entry.parts ?? {})) if (ex.parts.has(part)) bad.push(...propsOne(kit, entries, `${at}.parts.${part}`, `${name}.${part}`, pe, ex.parts.get(part)));
  }
  return bad;
}

// ---- 3. Defaults.

function defaultsOne(at, entry, model, entries, kit) {
  const bad = [];
  const base = entry.extends ? entries.get(entry.extends) : null;
  const baseModel = base ? kit.exports.get(entry.extends) : null;
  const props = listed(entry, entries, null);
  for (const [n, { decl, from }] of props) {
    // An inherited prop is forwarded to the component it extends, so its default is that component's.
    const defaults = from && from === entry.extends && baseModel ? baseModel.defaults : model.defaults;
    const has = defaults.has(n), init = defaults.get(n);
    if (isObj(init) && init.unreadable) bad.push(`${at}.props.${n}: the initializer ${init.unreadable} is not a literal the catalog can state`);
    else if (decl.default !== undefined && !has) bad.push(`${at}.props.${n}.default is ${JSON.stringify(decl.default)}, but the component sets no default for ${n}`);
    else if (has && decl.default === undefined) bad.push(`${at}.props.${n}: the component defaults it to ${JSON.stringify(init)}; state "default": ${JSON.stringify(init)}`);
    else if (has && decl.default !== init) bad.push(`${at}.props.${n}.default is ${JSON.stringify(decl.default)}, but the component defaults it to ${JSON.stringify(init)}`);
  }
  for (const n of model.defaults.keys()) if (!props.has(n) && model.owned.has(n) && n !== 'className') bad.push(`${at}: the component defaults ${n}, which is not listed`);
  return bad;
}
export function defaultsProblems(kit, catalog) {
  const bad = [], entries = entriesOf(catalog);
  for (const [name, { file, entry }] of entries) {
    const ex = kit.exports.get(name);
    if (!ex) continue;
    const at = `catalog: ${file} ${name}`;
    if (ex.kind === 'function') bad.push(...defaultsOne(at, entry, ex, entries, kit));
    else for (const [part, pe] of Object.entries(entry.parts ?? {})) if (ex.parts.has(part)) bad.push(...defaultsOne(`${at}.parts.${part}`, pe, ex.parts.get(part), entries, kit));
  }
  return bad;
}

// ---- 4. Parts.

export function partsProblems(kit, catalog) {
  const bad = [];
  for (const [name, { file, entry }] of entriesOf(catalog)) {
    const ex = kit.exports.get(name);
    if (!ex) continue;
    const at = `catalog: ${file} ${name}`;
    if (ex.kind === 'function') { if (entry.parts) bad.push(`${at} has parts, but ${name} is a component, not a compound object`); continue; }
    if (!isObj(entry.parts)) { bad.push(`${at}: ${name} is compound (${list([...ex.parts.keys()])}); list its parts`); continue; }
    const real = [...ex.parts.keys()], stated = Object.keys(entry.parts);
    for (const p of real) if (!stated.includes(p)) bad.push(`${at}.parts is missing ${p}, a member of ${name}`);
    for (const p of stated) if (!real.includes(p)) bad.push(`${at}.parts.${p} is not a member of ${name} (it has ${list(real)})`);
    for (const [p, pe] of Object.entries(entry.parts)) for (const i of [pe.inside ?? []].flat()) if (!real.includes(i)) bad.push(`${at}.parts.${p}.inside names ${i}, which is not a part of ${name}`);
    for (const r of entry.requiredParts ?? []) if (!real.includes(r)) bad.push(`${at}.requiredParts names ${r}, which is not a part of ${name}`);
    if (!entry.requiredParts?.length) bad.push(`${at} is compound, so it needs requiredParts`);
  }
  return bad;
}

// ---- 5. Golden example.

/** Failure lines for each folder's example. `read(rel)` returns a file's text or null (a seeded test passes its own). */
export function exampleProblems(catalog, root = REPO, read = (f) => (fs.existsSync(path.join(root, f)) ? fs.readFileSync(path.join(root, f), 'utf8') : null)) {
  const bad = [];
  for (const c of catalog) {
    if (typeof c.data?.example !== 'string') continue;
    const file = `kit/${c.folder}/${c.data.example}`, at = `catalog: ${file}`;
    const strays = fs.existsSync(path.join(root, 'kit', c.folder)) ? fs.readdirSync(path.join(root, 'kit', c.folder)).filter((f) => f.endsWith('.example.tsx') && f !== c.data.example) : [];
    for (const s of strays) bad.push(`catalog: kit/${c.folder}/${s} is an example ${c.file} does not name; each folder has one golden example`);
    const text = read(file);
    if (text === null) { bad.push(`${at} does not exist (named by ${c.file})`); continue; }
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (sf.parseDiagnostics.length) { bad.push(`${at} could not be parsed`); continue; }
    const fns = new Set(sf.statements.filter(ts.isFunctionDeclaration).map((f) => f.name?.text));
    const isDefault = (s) => s.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    const def = sf.statements.find((s) => (ts.isFunctionDeclaration(s) && isDefault(s)) || (ts.isExportAssignment(s) && !s.isExportEquals));
    const component = def && (ts.isFunctionDeclaration(def) ? /^[A-Z]/.test(def.name?.text ?? '') : ts.isIdentifier(def.expression) && fns.has(def.expression.text) && /^[A-Z]/.test(def.expression.text));
    if (!component) bad.push(`${at} must default-export a component (export default function Name() {...})`);
    for (const s of sf.statements.filter(ts.isImportDeclaration)) {
      const spec = s.moduleSpecifier.text;
      if (spec.startsWith('.') && spec !== '../index') bad.push(`${at} imports ${spec}; import the kit only from "../index", the way a consumer sees it`);
    }
    const tags = new Set();
    const walk = (n) => { if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) tags.add(n.tagName.getText(sf)); ts.forEachChild(n, walk); };
    walk(sf);
    const roots = new Set([...tags].map((t) => t.split('.')[0]));
    for (const [name, entry] of Object.entries(c.data.components ?? {})) {
      if (!roots.has(name)) bad.push(`${at} does not use ${name}; the golden example uses every component in its folder`);
      for (const p of entry?.requiredParts ?? []) if (!tags.has(`${name}.${p}`)) bad.push(`${at} does not use ${name}.${p}, a required part`);
    }
  }
  return bad;
}

// ---- 6. Prose.

const sentences = (s) => (s.match(/[.!?](?=\s+[A-Z]|$)/g) ?? []).length;
export function proseProblems(catalog) {
  const bad = [], entries = entriesOf(catalog);
  const resolves = (x) => TAGS.has(x) || entries.has(x) || (x.includes('.') && isObj(entries.get(x.split('.')[0])?.entry.parts?.[x.split('.')[1]]));
  const one = (at, e) => {
    if (typeof e?.description === 'string') {
      if (e.description.length > LIMITS.description) bad.push(`${at}.description is ${e.description.length} characters; the limit is ${LIMITS.description}`);
      if (sentences(e.description.trim()) !== 1) bad.push(`${at}.description must be one sentence ending in a full stop`);
    }
    for (const k of ['useWhen', 'avoidWhen', 'a11y']) {
      const xs = Array.isArray(e?.[k]) ? e[k] : [];
      if (xs.length > LIMITS.items) bad.push(`${at}.${k} has ${xs.length} items; the limit is ${LIMITS.items}`);
      xs.forEach((x, i) => {
        const text = typeof x === 'string' ? x : x?.text ?? '';
        if (!text.trim()) bad.push(`${at}.${k}[${i}] is empty`);
        if (text.length > LIMITS.item) bad.push(`${at}.${k}[${i}] is ${text.length} characters; the limit is ${LIMITS.item}`);
        if (isObj(x) && !resolves(x.instead)) bad.push(`${at}.${k}[${i}].instead names ${x.instead}, which is neither a catalog entry nor a native element`);
      });
    }
    for (const [n, p] of Object.entries(e?.props?.properties ?? {})) if (typeof p?.description === 'string' && p.description.length > LIMITS.propDescription) bad.push(`${at}.props.${n}.description is ${p.description.length} characters; the limit is ${LIMITS.propDescription}`);
    for (const [n, p] of Object.entries(isObj(e?.parts) ? e.parts : {})) one(`${at}.parts.${n}`, p);
  };
  for (const [name, { file, entry }] of entries) one(`catalog: ${file} ${name}`, entry);
  for (const c of catalog) for (const v of CHECKS['em-dash'].run(c.file, c.text)) bad.push(`catalog: ${c.file}:${v.line} em-dash ${v.message}`);
  return bad;
}

// ---- 7. Aggregate.

export const CONVENTIONS = {
  import: 'Import components from kit/index.ts and the styles once from kit/kit.css, after the brand token CSS.',
  className: 'Every component and part accepts className unless its entry says "className": false; className is never listed in props.',
  passthrough: 'Props not listed forward to the passthrough type; a listed one marked "x-from": "base-ui" is a passthrough prop worth knowing.',
  'x-type': 'A prop JSON cannot carry: node (any React child), element (one React element), function, or object (a DOM node or a ref).',
  brands: 'Brands differ through token values only. There is no brand, theme or style variant prop.',
};

/** kit/catalog.json, as text: every entry with its folder's example source inlined. */
export function buildAggregate(catalog, root = REPO) {
  const components = {};
  for (const c of catalog) {
    const file = `kit/${c.folder}/${c.data.example}`;
    const code = fs.readFileSync(path.join(root, file), 'utf8');
    for (const [name, entry] of Object.entries(c.data.components)) components[name] = { ...entry, example: { file, code } };
  }
  return `${JSON.stringify({ version: 1, module: 'kit/index.ts', conventions: CONVENTIONS, components }, null, 2)}\n`;
}
export function aggregateProblems(catalog, root = REPO) {
  const file = path.join(root, AGGREGATE);
  if (!fs.existsSync(file)) return [`catalog: ${AGGREGATE} is missing; run npm run catalog:build and commit it`];
  let built;
  try { built = buildAggregate(catalog, root); } catch (e) { return [`catalog: cannot build ${AGGREGATE}: ${e.message.split('\n')[0]}`]; }
  return built === fs.readFileSync(file, 'utf8') ? [] : [`catalog: ${AGGREGATE} differs from what the folder catalogs and examples build; run npm run catalog:build and commit it`];
}

// ---- All of it.

/** Every failure line for the catalog under `root`. Schema problems stop the run: the other checks assume the shape. */
export function catalogProblems(root = REPO, catalog = loadCatalog(root)) {
  const schema = schemaProblems(catalog);
  if (schema.length) return schema;
  const kit = readKit(catalog, root);
  return [
    ...coverageProblems(kit, catalog, root),
    ...propsProblems(kit, catalog),
    ...defaultsProblems(kit, catalog),
    ...partsProblems(kit, catalog),
    ...exampleProblems(catalog, root),
    ...proseProblems(catalog),
    ...aggregateProblems(catalog, root),
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const catalog = loadCatalog();
  const bad = catalogProblems(REPO, catalog);
  if (bad.length) {
    console.error(bad.join('\n'));
    console.error(`catalog:check: ${bad.length} problem(s)`);
    process.exit(1);
  }
  const n = catalog.reduce((a, c) => a + Object.keys(c.data.components).length, 0);
  console.log(`catalog:check: ${n} entries in ${catalog.length} folder catalogs match kit/index.ts, their examples and ${AGGREGATE}`);
}
