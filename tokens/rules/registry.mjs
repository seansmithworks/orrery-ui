// The rules registry self-check. tokens/rules/rules.json is the one list of the system's floors and rules.
// Every rule names a check that runs, or says why none can. This module fails when that stops being true.
// Run inside npm run tokens:check. Every function returns failure lines; none writes.
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from '../lib/source.mjs';
import * as system from '../lib/system.mjs';
import * as checks from '../lib/checks.mjs';
import * as gates from '../lib/gates.mjs';
import * as bridge from '../lib/bridge.mjs';
import { CHECKS } from './check-source.mjs';

export const RULES_FILE = path.join(REPO, 'tokens/rules/rules.json');
const KINDS = ['token-gate', 'source-check', 'artifact-checker', 'test'];
const LAYERS = ['floor', 'rule'];
const APPLIES = ['tokens', 'source', 'page'];
// Token gates live in these modules. A ref is `<file>#<export>` or `<file>#<export>.<method>` (a method on what the export returns).
const MODULES = { 'tokens/lib/system.mjs': system, 'tokens/lib/checks.mjs': checks, 'tokens/lib/gates.mjs': gates, 'tokens/lib/bridge.mjs': bridge };
// Seeded-failure tests are found by name in these files.
const TEST_FILES = ['tokens/test.mjs', 'tokens/test-checks.mjs', 'tokens/rules/test-rules.mjs'];
const ARTIFACT_CHECK = 'artifact/check/check.mjs';
const ARTIFACT_TEST = 'artifact/check/test.mjs';
const SCOPES = ['enforcing', 'opt-in'];
const REASON_KINDS = ['needs-render', 'judgement', 'held-decision', 'not-built'];
const ENTRY_POINTS = ['tokens/build.mjs', 'tokens/check.mjs'];

const read = (rel, root) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel, root) => fs.existsSync(path.join(root, rel));

/** Names of the tests declared as `'name'() {` in the seeded-test files. */
export function testNames(root = REPO) {
  const names = new Set();
  for (const f of TEST_FILES) if (exists(f, root)) for (const m of read(f, root).matchAll(/^\s+(['"`])(.+)\1\(\)\s*\{/gm)) names.add(m[2]);
  return names;
}

/** The artifact checker's rule ids, read from `const RULES = [...]` in artifact/check/check.mjs. */
export function artifactRules(root = REPO) {
  const m = /const RULES = \[([^\]]*)\]/.exec(read(ARTIFACT_CHECK, root));
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
}

/** The text of the token build's entry points and every relative module they import, so a gate can be shown to be wired in. */
function reachableText(root) {
  const seen = new Set(), texts = [];
  const visit = (rel) => {
    if (seen.has(rel) || !exists(rel, root)) return;
    seen.add(rel);
    const text = read(rel, root);
    texts.push(stripCode(text));
    for (const m of text.matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)) visit(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
  };
  ENTRY_POINTS.forEach(visit);
  return texts.join('\n');
}
// The name a test title must carry: the gate's function (or method), or the source check's id.
const symbol = ({ kind, ref }) => (kind === 'token-gate' ? ref.split('#')[1].split('.').pop() : kind === 'source-check' ? ref : null);
const count = (text, re) => (text.match(re) ?? []).length;
/** Source text with comments and the insides of string and template literals blanked, so a mention in either is not a use. */
export function stripCode(text) {
  let out = '', quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], two = text.slice(i, i + 2);
    if (quote) {
      if (ch === '\\') { out += '  '; i++; } else if (ch === quote) { quote = null; out += ch; } else out += ch === '\n' ? ch : ' ';
    } else if (two === '//') { while (i < text.length && text[i] !== '\n') { out += ' '; i++; } out += '\n'; }
    else if (two === '/*') { const end = text.indexOf('*/', i + 2) === -1 ? text.length : text.indexOf('*/', i + 2) + 2; out += text.slice(i, end).replace(/[^\n]/g, ' '); i = end - 1; }
    else { if (ch === '"' || ch === "'" || ch === '`') quote = ch; out += ch; }
  }
  return out;
}

function resolveGate(ref, root) {
  const [file, sym] = ref.split('#');
  if (!sym) return `ref "${ref}" must be <file>#<export> or <file>#<export>.<method>`;
  if (!exists(file, root)) return `file ${file} does not exist`;
  const mod = MODULES[file];
  if (!mod) return `${file} is not a module the registry can load; add it to MODULES in tokens/rules/registry.mjs`;
  const [name, method] = sym.split('.');
  if (typeof mod[name] !== 'function') return `${file} exports no function ${name}`;
  if (method && typeof mod[name]()?.[method] !== 'function') return `${name}() in ${file} has no method ${method}`;
  // Wired in: called by the build or the check or a module they import, in code (a comment or a string does not count).
  const text = reachableText(root);
  if (count(text, method ? new RegExp(`\\.${method}\\s*\\(`, 'g') : new RegExp(`(?<!function\\s+)\\b${name}\\s*\\(`, 'g')) < 1) return `${method ?? name} is not called by tokens/build.mjs, tokens/check.mjs or a module they import`;
  return null;
}

/**
 * Failure lines for a list of rules. `root` is the repo (a seeded test passes a temp copy);
 * `names` and `artifact` are what the repo declares (tests by name, artifact rule ids).
 */
export function registryProblems(rules, { root = REPO, names = testNames(root), artifact = artifactRules(root) } = {}) {
  const bad = [];
  if (!Array.isArray(rules)) return ['rules registry: tokens/rules/rules.json must be a list of rules'];
  const seen = new Set();
  rules.forEach((r, i) => {
    const id = typeof r?.id === 'string' && r.id ? r.id : null;
    const at = `rules registry: ${id ?? `rule ${i + 1}`}`;
    if (!id) return bad.push(`${at} has no id`);
    if (seen.has(id)) bad.push(`${at} is declared twice (duplicate id)`);
    seen.add(id);
    if (!LAYERS.includes(r.layer)) bad.push(`${at} has layer ${JSON.stringify(r.layer)}; use ${LAYERS.join(' or ')}`);
    if (typeof r.statement !== 'string' || !r.statement.trim()) bad.push(`${at} has no statement`);
    if (!Array.isArray(r.applies) || !r.applies.length || r.applies.some((a) => !APPLIES.includes(a))) bad.push(`${at} applies must list some of ${APPLIES.join(', ')}`);
    if (r.scope !== undefined && !SCOPES.includes(r.scope)) bad.push(`${at} scope ${JSON.stringify(r.scope)} is not one of ${SCOPES.join(', ')}`);
    if (r.scope === 'opt-in' && !/opt-in/i.test(r.statement ?? '')) bad.push(`${at} has scope opt-in, so its statement must say "opt-in"`);
    if (r.check === null || r.check === undefined) {
      if (r.scope !== undefined) bad.push(`${at} has no check, so it has no scope`);
      if (typeof r.reason?.text !== 'string' || !r.reason.text.trim()) bad.push(`${at} has no check and no reason; give it a check, or say why none is possible`);
      else if (!REASON_KINDS.includes(r.reason.kind)) bad.push(`${at} reason.kind ${JSON.stringify(r.reason.kind)} is not one of ${REASON_KINDS.join(', ')}`);
      return;
    }
    if (r.reason !== undefined) bad.push(`${at} has a check, so it should not carry a reason`);
    const { kind, ref, test } = r.check, check = r.check;
    if (!KINDS.includes(kind)) return bad.push(`${at} check.kind ${JSON.stringify(kind)} is not one of ${KINDS.join(', ')}`);
    if (typeof ref !== 'string' || !ref) return bad.push(`${at} check has no ref`);
    let why = null;
    if (kind === 'token-gate') why = resolveGate(ref, root);
    else if (kind === 'source-check') why = typeof CHECKS[ref]?.run === 'function' ? null : `no source check ${ref} in tokens/rules/check-source.mjs`;
    else if (kind === 'artifact-checker') why = artifact.includes(ref) ? null : `${ARTIFACT_CHECK} has no rule ${ref} (it has: ${artifact.join(', ')})`;
    else if (!exists(ref, root)) why = `file ${ref} does not exist`;
    if (why) return bad.push(`${at} check ref does not resolve: ${why}`);
    // Exercised: a named seeded-failure test for a gate or source check; a mutation in the artifact checker's own test; a test file is its own.
    // check.test must name a real test whose title carries the rule id in brackets, so a ref cannot be re-pointed at an unrelated test.
    const needsTest = kind === 'token-gate' || kind === 'source-check' || (kind === 'test' && !/test/.test(path.basename(ref)));
    if (needsTest) {
      if (typeof test !== 'string' || !test) bad.push(`${at} check has no seeded-failure test; name one in check.test`);
      else if (!names.has(test)) bad.push(`${at} check.test names a test that does not exist: ${test}`);
      else if (!test.includes(`[${id}]`)) bad.push(`${at} check.test must carry the rule id in its title as [${id}]: ${test}`);
      else if (symbol(check) && !test.includes(symbol(check))) bad.push(`${at} check.test must name the checked function ${symbol(check)} in its title: ${test}`);
    } else if (kind === 'artifact-checker' && !read(ARTIFACT_TEST, root).includes(`'${ref}'`)) bad.push(`${at} artifact rule ${ref} is not exercised by ${ARTIFACT_TEST}`);
  });
  return bad;
}

/** The registry on disk. */
export const ruleProblems = () => {
  let rules;
  try { rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')); } catch (e) { return [`rules registry: cannot read tokens/rules/rules.json: ${e.message.split('\n')[0]}`]; }
  return registryProblems(rules);
};
