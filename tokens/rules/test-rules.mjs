// Tests for the rules layer: the new token gates, the source checks and the registry self-check. Run by tokens/test.mjs.
// Seeds are temp copies or in-memory fixtures; nothing in the repo is changed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO, TOKENS } from '../lib/source.mjs';
import { driftGate } from '../lib/gates.mjs';
import { checkText } from './check-source.mjs';
import { registryProblems, ruleProblems, RULES_FILE } from './registry.mjs';

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const CLI = path.join(TOKENS, 'rules/check-source.mjs');
const TOO_PALE = { colorSpace: 'srgb', components: [0.7804, 0.7804, 0.8], hex: '#c7c7cc' };
const hits = (file, text, rule) => checkText(file, text, [rule]).map((v) => `${v.line} ${v.rule} ${v.message}`);

export function ruleTests({ tmp, run }) {
  let n = 0;
  // Build a temp copy of the token source with one JSON edit.
  const seeded = (file, edit) => {
    const src = path.join(tmp, `rules-src-${++n}`);
    for (const d of ['base', 'brands']) fs.cpSync(path.join(TOKENS, d), path.join(src, d), { recursive: true });
    const f = path.join(src, file), doc = readJson(f);
    edit(doc);
    fs.writeFileSync(f, JSON.stringify(doc, null, 2));
    const out = path.join(tmp, `rules-out-${n}`);
    return { out, r: run('build.mjs', '--source', src, '--out', out) };
  };
  const springs = (d) => d.$extensions['com.orrery'].motion.spring;
  const rules = () => readJson(RULES_FILE);
  const withRule = (change) => { const list = rules(); change(list); return list; };
  const checkOf = (list, id) => list.find((r) => r.id === id).check;

  return {
    '[reduced-motion-form] reducedMotionGate: reduced motion: a spring with no $reduced fails the build, naming the spring, and writes nothing'() {
      const { out, r } = seeded('base/motion.tokens.json', (d) => { delete springs(d)['iris-snap'].$reduced; });
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /^reduced motion form missing: iris-snap \(brand orrery, mode light\) has \$reduced unset; use opacity, none, instant$/m);
      assert.doesNotMatch(r.stderr, /iris-open/);
      assert.equal(fs.existsSync(out), false);
    },

    'reduced motion: a $reduced that is not opacity, none or instant fails the build, naming the spring'() {
      const { r } = seeded('base/motion.tokens.json', (d) => { springs(d)['iris-open'].$reduced = 'fade'; });
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /^reduced motion form missing: iris-open \(brand orrery, mode dark\) has \$reduced "fade"; use opacity, none, instant$/m);
    },

    '[focus-ring-contrast] focus ring: an accent too close to the page fails, naming the ring role, the surface and both ratios, and writes nothing'() {
      const { out, r } = seeded('brands/orrery/modes/light.tokens.json', (d) => { d.color.accent.$value = TOO_PALE; });
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /^contrast: brand orrery, mode light: color\.accent on color\.page is 1\.68:1, needs 3:1 \(ui\)$/m);
      assert.match(r.stderr, /^contrast: brand orrery, mode light: color\.accent on color\.layer-1 is \d\.\d\d:1, needs 3:1 \(ui\)$/m);
      assert.match(r.stderr, /^contrast: brand orrery, mode light: color\.accent on color\.layer-2 is \d\.\d\d:1, needs 3:1 \(ui\)$/m);
      assert.doesNotMatch(r.stderr, /mode dark/);
      assert.equal(fs.existsSync(out), false);
    },

    '[generated-matches-source] driftGate: drift: a generated file that differs, is missing or is stale fails, naming the file'() {
      const committed = path.join(tmp, 'drift-committed'), fresh = path.join(tmp, 'drift-fresh');
      for (const dir of [committed, fresh]) fs.mkdirSync(path.join(dir, 'css'), { recursive: true });
      for (const dir of [committed, fresh]) for (const f of ['css/a.css', 'css/b.css']) fs.writeFileSync(path.join(dir, f), 'same');
      assert.deepEqual(driftGate(committed, fresh), []);
      fs.writeFileSync(path.join(fresh, 'css/b.css'), 'changed');
      fs.writeFileSync(path.join(fresh, 'css/new.css'), 'new');
      fs.writeFileSync(path.join(committed, 'css/old.css'), 'old');
      assert.deepEqual(driftGate(committed, fresh), ['differs from source: tokens/generated/css/b.css', 'no longer generated: tokens/generated/css/old.css', 'not committed: tokens/generated/css/new.css']);
    },

    '[no-literal-color] source rules: literal-color fails a bare hex, color function, named color and system color, naming file, line and property, and passes a var() fallback'() {
      const bad = ['.a {', '  color: #1d1d1f;', '  background: rgba(0, 0, 0, .06);', '  border: 1px solid red;', '  outline-color: ButtonText;', '  filter: drop-shadow(0 1px 2px black);', '  mask-image: linear-gradient(#000, transparent);', '}'].join('\n');
      assert.deepEqual(hits('k.css', bad, 'literal-color'), [
        '2 literal-color literal color #1d1d1f in color: use a color role, with a hex only as a var() fallback',
        '3 literal-color literal color rgba() in background: use a color role, with a literal only as a var() fallback',
        '4 literal-color literal color red in border: use a color role, with a literal only as a var() fallback',
        '5 literal-color literal color ButtonText in outline-color: use a color role, with a literal only as a var() fallback',
        '6 literal-color literal color black in filter: use a color role, with a literal only as a var() fallback',
        '7 literal-color literal color #000 in mask-image: use a color role, with a hex only as a var() fallback',
      ]);
      const ok = ['.a {', '  color: var(--orrery-iris-text, #1d1d1f);', '  background: color-mix(in srgb, var(--x, rgba(0,0,0,.06)) 7%, transparent);', '  border: 1px solid var(--line, var(--line-2, red));', '  animation-name: red;', '  outline: 2px solid currentColor;', '  font-family: "Red Hat";', '  width: calc(10px * tan(45deg));', '  filter: drop-shadow(0 1px 2px var(--shadow, black));', '}', '/* color: #fff; */', '#abc { margin: 0; }'].join('\n');
      assert.deepEqual(hits('k.css', ok, 'literal-color'), []);
      assert.match(hits('k.css', '.a { --x: #fff; }', 'literal-color')[0], /^1 literal-color literal color #fff in --x/);
    },

    '[no-literal-spacing] source rules: literal-spacing fails a pixel value a space or radius token holds, naming the token to use, and passes a var() and an off-scale value'() {
      const bad = ['.a {', '  padding: 8px 0;', '  border-radius: 10px;', '  gap: var(--space-8, 8px);', '  margin: 7px;', '  width: 8px;', '}'].join('\n');
      assert.deepEqual(hits('k.css', bad, 'literal-spacing'), [
        '2 literal-spacing literal 8px in padding: use var(--space-8)',
        '3 literal-spacing literal 10px in border-radius: use var(--radius-panel)',
      ]);
      assert.deepEqual(hits('k.css', ['.a {', '  --icon-size: 16px;', '  --avatar: 40px;', '  --card-padding: 16px;', '}'].join('\n'), 'literal-spacing'), ['4 literal-spacing literal 16px in --card-padding: use var(--space-16)']);
      const more = ['.a {', '  margin: 0 -8px;', '  --pad: 16px;', '  inset: 4px;', '  top: -12px;', '  scroll-padding-top: 24px;', '  scroll-margin: 8px;', '  outline-offset: 4px;', '  --sheet-radius: 10px;', '  --size: 7px;', '}'].join('\n');
      assert.deepEqual(hits('k.css', more, 'literal-spacing'), [
        '2 literal-spacing literal -8px in margin: use var(--space-8)',
        '3 literal-spacing literal 16px in --pad: use var(--space-16)',
        '4 literal-spacing literal 4px in inset: use var(--space-4)',
        '5 literal-spacing literal -12px in top: use var(--space-12)',
        '6 literal-spacing literal 24px in scroll-padding-top: use var(--space-24)',
        '7 literal-spacing literal 8px in scroll-margin: use var(--space-8)',
        '8 literal-spacing literal 4px in outline-offset: use var(--space-4)',
        '9 literal-spacing literal 10px in --sheet-radius: use var(--radius-panel)',
      ]);
    },

    '[hit-target-source] source rules: control-min-size fails a marked control under 44px, naming the property and selector, and passes an unmarked rule, a 44px control and a pseudo hit area'() {
      const bad = ['/* orrery-control */', '.btn {', '  min-height: 36px;', '  width: 44px;', '}', '.icon { height: 16px; }', '/* orrery-control */', '.ok { height: 44px; min-width: var(--hit-target-min); }'].join('\n');
      assert.deepEqual(hits('k.css', bad, 'control-min-size'), ['3 control-min-size min-height: 36px on control .btn; the hit target floor is 44px']);
      const pseudo = ['/* orrery-control */', '/* orrery-hit-area: pseudo */', '.btn { height: 24px; }', '.btn::after { content: ""; position: absolute; inset: -10px; }'].join('\n');
      assert.deepEqual(hits('k.css', pseudo, 'control-min-size'), []);
    },

    '[inline-style-literal] source rules: inline-style-literal fails a literal color and a token-sized spacing number in style={{ }}, and passes var() values and off-scale numbers'() {
      const bad = ['export const A = () => (', '  <div', '    style={{', '      color: "#1d1d1f",', '      padding: 8,', '      marginTop: "-16px",', '      background: "var(--surface, #fff)",', '      borderRadius: 10,', '    }}', '  />', ');'].join('\n');
      assert.deepEqual(hits('k.tsx', bad, 'inline-style-literal'), [
        '4 inline-style-literal inline style: literal color #1d1d1f in color: use a color role, with a hex only as a var() fallback; move it into CSS or pass it as a custom property',
        '5 inline-style-literal inline style: literal 8px in padding: use var(--space-8); move it into CSS or pass it as a custom property',
        '6 inline-style-literal inline style: literal -16px in margin-top: use var(--space-16); move it into CSS or pass it as a custom property',
        '8 inline-style-literal inline style: literal 10px in border-radius: use var(--radius-panel); move it into CSS or pass it as a custom property',
      ]);
      const ok = ['export const A = () => <div style={{ color: "var(--text)", padding: "var(--space-8)", marginTop: 7, width: 8, opacity: 0, transform: `translate(${x}px, 0)` }} />;', '// style={{ color: "#fff" }}'].join('\n');
      assert.deepEqual(hits('k.tsx', ok, 'inline-style-literal'), []);
    },

    '[no-em-dashes] source rules: em-dash fails an em dash, its entity and its escapes, naming file, line and rule, and passes a comment and clean text'() {
      const dash = '—';
      const bad = [`export const a = "Saved ${dash} done";`, 'const b = "x&mdash;y";', 'const c = "x\\u2014y";', `<p>Wait${dash}what</p>`].join('\n');
      assert.deepEqual(hits('k.tsx', bad, 'em-dash').map((s) => s.slice(0, 12)), ['1 em-dash em', '2 em-dash em', '3 em-dash em', '4 em-dash em']);
      const ok = [`// a note ${dash} fine`, `/* ${dash} */`, 'const a = "plain, text";'].join('\n');
      assert.deepEqual(hits('k.tsx', ok, 'em-dash'), []);
      assert.equal(hits('k.css', `.a::after { content: "${dash}"; }`, 'em-dash').length, 1);
    },

    'source rules: the CLI prints file:line rule-id message and exits 1, exits 0 when clean, and exits 2 on a missing path'() {
      const dir = path.join(tmp, 'cli');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'bad.css'), '.a {\n  color: #fff;\n}\n');
      fs.writeFileSync(path.join(dir, 'good.css'), '.a { color: var(--x, #fff); }\n');
      const cli = (...a) => spawnSync(process.execPath, [CLI, ...a], { encoding: 'utf8', cwd: dir });
      const bad = cli('bad.css');
      assert.equal(bad.status, 1);
      assert.match(bad.stderr, /^bad\.css:2 literal-color literal color #fff in color: /m);
      assert.equal(cli('good.css').status, 0);
      assert.equal(cli('--only', 'em-dash', 'bad.css').status, 0);
      assert.equal(cli('nope.css').status, 2);
      fs.writeFileSync(path.join(dir, 'notes.md'), 'a \u2014 b');
      const md = cli('notes.md');
      assert.equal(md.status, 2);
      assert.match(md.stderr, /^rules:check: notes\.md is not a file type any rule reads \(/m);
    },

    'source rules: the package CSS has no literal color outside a var() fallback'() {
      const r = spawnSync(process.execPath, [CLI, '--only', 'literal-color', path.join(REPO, 'src/styles.module.css')], { encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
    },

    'registry: the real rules.json passes the self-check'() {
      assert.deepEqual(ruleProblems(), []);
    },

    'registry: a rule with neither a check nor a reason fails, naming the rule'() {
      const bad = registryProblems(withRule((l) => { l.push({ id: 'floating', layer: 'rule', statement: 'A rule with nothing behind it.', applies: ['page'], check: null }); }));
      assert.deepEqual(bad, ['rules registry: floating has no check and no reason; give it a check, or say why none is possible']);
    },

    'registry: a check ref that does not resolve fails for every kind, naming the rule and the reason'() {
      const swap = (id, check) => registryProblems(withRule((l) => { l.find((r) => r.id === id).check = check; })).join('\n');
      assert.match(swap('hit-target-token', { kind: 'token-gate', ref: 'tokens/lib/system.mjs#noSuchGate', test: 'x' }), /^rules registry: hit-target-token check ref does not resolve: tokens\/lib\/system\.mjs exports no function noSuchGate$/m);
      assert.match(swap('hit-target-token', { kind: 'token-gate', ref: 'tokens/lib/nowhere.mjs#a', test: 'x' }), /check ref does not resolve: file tokens\/lib\/nowhere\.mjs does not exist$/m);
      assert.match(swap('no-em-dashes', { kind: 'source-check', ref: 'no-such-check', test: 'x' }), /^rules registry: no-em-dashes check ref does not resolve: no source check no-such-check in tokens\/rules\/check-source\.mjs$/m);
      assert.match(swap('accent-branded-pages', { kind: 'artifact-checker', ref: 'no-such-rule' }), /^rules registry: accent-branded-pages check ref does not resolve: artifact\/check\/check\.mjs has no rule no-such-rule \(it has: token-colors, /m);
      assert.match(swap('springs-match-src', { kind: 'test', ref: 'tokens/missing.test.mjs' }), /^rules registry: springs-match-src check ref does not resolve: file tokens\/missing\.test\.mjs does not exist$/m);
    },

    'registry: a duplicate id fails, naming the id'() {
      const bad = registryProblems(withRule((l) => { l.push({ ...l[0] }); }));
      assert.deepEqual(bad, [`rules registry: ${rules()[0].id} is declared twice (duplicate id)`]);
    },

    'registry: a check that no seeded-failure test exercises fails, whether the test is unnamed, missing or the artifact rule has no mutation'() {
      const swap = (id, change) => registryProblems(withRule((l) => { change(checkOf(l, id)); }));
      assert.deepEqual(swap('no-em-dashes', (c) => { delete c.test; }), ['rules registry: no-em-dashes check has no seeded-failure test; name one in check.test']);
      assert.deepEqual(swap('no-em-dashes', (c) => { c.test = 'a test nobody wrote'; }), ['rules registry: no-em-dashes check.test names a test that does not exist: a test nobody wrote']);
      // An artifact rule counts as exercised only when artifact/check/test.mjs names it: seed an artifact list holding a rule that file never mentions.
      const list = withRule((l) => { checkOf(l, 'accent-branded-pages').ref = 'never-mutated'; });
      assert.deepEqual(registryProblems(list, { artifact: ['token-colors', 'contrast', 'never-mutated'] }), ['rules registry: accent-branded-pages artifact rule never-mutated is not exercised by artifact/check/test.mjs']);
    },

    '[css-var-audit] audit: a variable the CSS reads that nothing writes or documents fails the audit'() {
      const root = path.join(tmp, 'audit-root');
      fs.cpSync(path.join(REPO, 'src'), path.join(root, 'src'), { recursive: true });
      fs.copyFileSync(path.join(REPO, 'README.md'), path.join(root, 'README.md'));
      const audit = () => spawnSync(process.execPath, [path.join(REPO, 'scripts/audit-css-vars.mjs'), root], { encoding: 'utf8' });
      assert.equal(audit().status, 0);
      fs.appendFileSync(path.join(root, 'src/styles.module.css'), '\n.seeded { width: var(--orrery-iris-seeded-orphan); }\n');
      const r = audit();
      assert.equal(r.status, 1);
      assert.match(r.stderr, /^FAIL .* CSS reads a variable that is neither written nor documented:\n {2}--orrery-iris-seeded-orphan$/m);
    },

    'registry: a ref re-pointed at an unrelated function, an unused function, or an unrelated test each fails'() {
      const swap = (id, change) => registryProblems(withRule((l) => { change(checkOf(l, id)); }));
      // The reviewer's probe: re-point head-py-matches at an unrelated function. The function is wired in, so only the test title can catch it.
      assert.deepEqual(swap('head-py-matches', (c) => { c.ref = 'tokens/lib/gates.mjs#headOutput'; }), [`rules registry: head-py-matches check.test must name the checked function headOutput in its title: ${checkOf(rules(), 'head-py-matches').test}`]);
      const unrelated = swap('hit-target-token', (c) => { c.test = checkOf(rules(), 'head-py-matches').test; });
      assert.deepEqual(unrelated, [`rules registry: hit-target-token check.test must carry the rule id in its title as [hit-target-token]: ${checkOf(rules(), 'head-py-matches').test}`]);
      // An exported function nothing uses.
      assert.match(swap('hit-target-token', (c) => { c.ref = 'tokens/lib/system.mjs#REDUCED_FORMS'; }).join('\n'), /check ref does not resolve: tokens\/lib\/system\.mjs exports no function REDUCED_FORMS/);
      // A gate that exists but is not wired in: a repo root whose build and check never mention it.
      const bare = path.join(tmp, 'unwired-root');
      fs.mkdirSync(path.join(bare, 'tokens/lib'), { recursive: true });
      fs.writeFileSync(path.join(bare, 'tokens/build.mjs'), '// systemGate(tokens) runs here\nconst note = "systemGate(x)";\n');
      fs.writeFileSync(path.join(bare, 'tokens/check.mjs'), '// no gates\n');
      fs.copyFileSync(path.join(TOKENS, 'lib/system.mjs'), path.join(bare, 'tokens/lib/system.mjs'));
      const unwired = registryProblems(withRule((l) => { l.length = 0; l.push(rules().find((r) => r.id === 'hit-target-token')); }), { root: bare, names: new Set(rules().map((r) => r.check?.test)), artifact: [] });
      assert.deepEqual(unwired, ['rules registry: hit-target-token check ref does not resolve: systemGate is not called by tokens/build.mjs, tokens/check.mjs or a module they import']);
    },

    'registry: a reason with an unknown kind, an opt-in scope that does not say opt-in, and a scope on a rule with no check each fail'() {
      const one = (id, change) => registryProblems(withRule((l) => { change(l.find((r) => r.id === id)); }));
      assert.deepEqual(one('no-gradients', (r) => { r.reason.kind = 'impossible'; }), ['rules registry: no-gradients reason.kind "impossible" is not one of needs-render, judgement, held-decision, not-built']);
      assert.deepEqual(one('no-gradients', (r) => { r.reason = 'a bare string'; }), ['rules registry: no-gradients has no check and no reason; give it a check, or say why none is possible']);
      assert.deepEqual(one('hit-target-source', (r) => { r.statement = 'A control is at least 44px.'; }), ['rules registry: hit-target-source has scope opt-in, so its statement must say "opt-in"']);
      assert.deepEqual(one('no-gradients', (r) => { r.scope = 'opt-in'; r.statement = 'Opt-in nothing.'; }), ['rules registry: no-gradients has no check, so it has no scope']);
    },

    '[no-literal-spacing] orrery-allow: a marker with a reason excuses its declaration only; no reason, an unknown id, a stale marker and a marker with no declaration are each a finding; markers stack'() {
      const both = (text) => checkText('k.css', text, ['literal-color', 'literal-spacing']).map((v) => `${v.line} ${v.rule} ${v.message}`).sort();
      const MSG = (n) => `${n} literal-spacing literal 8px in margin: use var(--space-8)`;
      assert.deepEqual(hits('k.css', ['.a {', '  margin: 8px;', '}'].join('\n'), 'literal-spacing'), [MSG(2)]);
      assert.deepEqual(hits('k.css', ['.a {', '  /* orrery-allow: literal-spacing optical nudge to match the icon */', '  margin: 8px;', '}'].join('\n'), 'literal-spacing'), []);
      const noReason = '2 orrery-allow orrery-allow: literal-spacing needs a reason, a word of 3 or more letters';
      assert.deepEqual(hits('k.css', ['.a {', '  /* orrery-allow: literal-spacing */', '  margin: 8px;', '}'].join('\n'), 'literal-spacing').sort(), [noReason, MSG(3)]);
      assert.deepEqual(hits('k.css', ['.a {', '  /* orrery-allow: literal-spacing ... */', '  margin: 8px;', '}'].join('\n'), 'literal-spacing').sort(), [noReason, MSG(3)]);
      assert.deepEqual(hits('k.css', ['.a {', '  /* orrery-allow: literal-spacing optical nudge */', '  margin: 8px;', '  padding: 8px;', '}'].join('\n'), 'literal-spacing'), ['4 literal-spacing literal 8px in padding: use var(--space-8)']);
      assert.deepEqual(hits('k.css', ['.a {', '  /* orrery-allow: literal-spaceing optical nudge */', '  margin: 8px;', '}'].join('\n'), 'literal-spacing').sort(), ['2 orrery-allow unknown rule id literal-spaceing; valid ids: literal-color, literal-spacing', MSG(3)]);
      assert.deepEqual(hits('k.css', ['.a {', '  /* orrery-allow: literal-spacing was needed once */', '  margin: var(--space-8);', '}'].join('\n'), 'literal-spacing'), ['2 orrery-allow unused orrery-allow: literal-spacing excuses nothing on the next declaration (stale, wrong rule, or already compliant)']);
      assert.deepEqual(hits('k.css', ['.a {', '  margin: 0;', '  /* orrery-allow: literal-spacing nothing follows */', '}'].join('\n'), 'literal-spacing'), ['3 orrery-allow unused orrery-allow: literal-spacing has no declaration after it']);
      // wrong rule for the declaration: a color marker on a spacing finding excuses nothing, and is stale
      assert.deepEqual(both(['.a {', '  /* orrery-allow: literal-color brand swatch */', '  margin: 8px;', '}'].join('\n')), ['2 orrery-allow unused orrery-allow: literal-color excuses nothing on the next declaration (stale, wrong rule, or already compliant)', MSG(3)]);
      // stacked markers, one per rule, excuse one declaration that breaks both rules; one marker covers only its own rule
      const decl = '  --card-padding: 8px solid #fff;';
      assert.deepEqual(both(['.a {', '  /* orrery-allow: literal-color brand swatch */', '  /* orrery-allow: literal-spacing optical nudge */', decl, '}'].join('\n')), []);
      assert.deepEqual(both(['.a {', '  /* orrery-allow: literal-color brand swatch */', decl, '}'].join('\n')), ['3 literal-spacing literal 8px in --card-padding: use var(--space-8)']);
      // one marker covers every finding of its rule within its one declaration
      assert.deepEqual(hits('k.css', ['.a {', '  /* orrery-allow: literal-color shadow tuned by eye */', '  box-shadow: 0 1px 2px #000, 0 4px 8px #111;', '}'].join('\n'), 'literal-color'), []);
    },

    '[no-literal-spacing] custom properties are read by name segment (pad, padding, gap, gutter, margin, space, spacing, inset, offset, indent, radius, radii), not by substring'() {
      const src = ['.a {', '  --card-padding: 16px;', '  --page-gutter: 24px;', '  --x-offset: 4px;', '  --orr-gap-count: 8px;', '  --sheet-radii: 10px;', '  --marginalia: 8px;', '  --paddington: 8px;', '  --icon-size: 16px;', '  --avatar: 40px;', '}'].join('\n');
      assert.deepEqual(hits('k.css', src, 'literal-spacing'), [
        '2 literal-spacing literal 16px in --card-padding: use var(--space-16)',
        '3 literal-spacing literal 24px in --page-gutter: use var(--space-24)',
        '4 literal-spacing literal 4px in --x-offset: use var(--space-4)',
        '5 literal-spacing literal 8px in --orr-gap-count: use var(--space-8)',
        '6 literal-spacing literal 10px in --sheet-radii: use var(--radius-panel)',
      ]);
    },

    '[no-literal-color] orrery-allow: a marker with a reason excuses the next declaration only, and with no reason it is a finding'() {
      assert.deepEqual(hits('k.css', ['.a {', '  /* orrery-allow: literal-color brand swatch shown as data */', '  background: #123456;', '  color: #fff;', '}'].join('\n'), 'literal-color'), ['4 literal-color literal color #fff in color: use a color role, with a hex only as a var() fallback']);
      assert.deepEqual(hits('k.css', ['.a {', '  /* orrery-allow: literal-color */', '  background: #123456;', '}'].join('\n'), 'literal-color').sort(), ['2 orrery-allow orrery-allow: literal-color needs a reason, a word of 3 or more letters', '3 literal-color literal color #123456 in background: use a color role, with a hex only as a var() fallback']);
    },

    '[inline-style-literal] orrery-allow is CSS-only: a marker in a TSX comment is a finding and excuses nothing, a marker inside a string is ignored, and keys starting -- are never flagged'() {
      const src = ['export const A = () => (', '  <div', '    style={{', '      // orrery-allow: inline-style-literal because reasons', '      color: "#fff",', '      "--orr-x": "#000",', '      "--orr-pad": 8,', '      content: "orrery-allow: inline-style-literal",', '    }}', '  />', ');'].join('\n');
      assert.deepEqual(hits('k.tsx', src, 'inline-style-literal').sort(), [
        '4 inline-style-literal orrery-allow is CSS-only; move the value into CSS',
        '5 inline-style-literal inline style: literal color #fff in color: use a color role, with a hex only as a var() fallback; move it into CSS or pass it as a custom property',
      ]);
    },

    '[inline-style-literal] attributes: only real JSX attributes style, animate, initial, exit, whileHover and whileTap are read, with arrays, nested ternaries, ??, ||, &&, call arguments and template strings; what is not read is pinned here'() {
      const t = (jsx) => hits('k.tsx', `export const A = () => (${jsx});`, 'inline-style-literal').length;
      // read
      assert.equal(t('<motion.div animate={{ backgroundColor: "#fff" }} />'), 1);
      assert.equal(t('<motion.div initial={{ opacity: 0, padding: 8 }} exit={{ color: "red" }} whileHover={{ margin: 16 }} whileTap={{ borderColor: "#000" }} />'), 4);
      assert.equal(t('<div style={on ? { color: "#fff" } : { padding: 8 }} />'), 2);
      assert.equal(t('<div style={on && { color: "#fff" }} />'), 1);
      assert.equal(t('<div style={{ color: on ? "#fff" : "var(--text)", padding: big ? 24 : 7 }} />'), 2);
      assert.equal(t('<div style={{ border: `1px solid #fff`, width: `${w}px` }} />'), 1);
      assert.equal(t('<motion.div animate={{ backgroundColor: ["#fff", "#000"] }} />'), 2);
      assert.equal(t('<div style={{ color: (on ? "#fff" : (big ? "red" : "var(--t)")) }} />'), 2);
      assert.equal(t('<div style={{ color: theme ?? "#fff", padding: gap || 8 }} />'), 2);
      assert.equal(t('<div style={merge({ color: "#fff" }, other)} />'), 1);
      // not an attribute of a tag
      assert.equal(t('<div data-style={{ color: "#fff" }} />'), 0);
      assert.equal(hits('k.tsx', 'let style = { color: "#fff" };\nconst initial = { padding: 8 };\nstyle = { color: "red" };', 'inline-style-literal').length, 0);
      // known not read
      assert.equal(t('<div style={styles} />'), 0);
      assert.equal(t('<div style={{ color: pick("#fff"), padding: space(8) }} />'), 0);
      assert.equal(t('<div style={{ [key]: "#fff" }} />'), 0);
      assert.equal(t('<div style={{ color: "#fff" as string }} />'), 0);
      assert.equal(t('<div style={{ ...base }} />'), 0);
      assert.equal(t('<motion.div transition={{ duration: 8, color: "#fff" }} />'), 0);
      assert.equal(t('<motion.div animate={{ transition: { padding: 8 }, transform: "translateX(8px)" }} />'), 0);
    },

    '[no-em-dashes] an apostrophe in JSX text is text, so a comment after it is still a comment, and a real string is still read'() {
      const dash = '—';
      assert.deepEqual(hits('k.tsx', `export const A = () => <p>Don't</p>; // note ${dash} fine`, 'em-dash'), []);
      assert.deepEqual(hits('k.tsx', `export const A = () => <p>Can't won't</p>; /* ${dash} */\nconst b = 'x ${dash} y';`, 'em-dash').map((x) => x.slice(0, 12)), ['2 em-dash em']);
    },

    'source rules: the CLI counts allowed exceptions, and lists each one sorted by marker line with the marker line and the finding line'() {
      const dir = path.join(tmp, 'cli-allow');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'a.css'), '.a {\n  /* orrery-allow: literal-spacing optical nudge */\n  margin: 8px;\n  /* orrery-allow: literal-color brand swatch */\n  color: #fff;\n}\n');
      const r = spawnSync(process.execPath, [CLI, 'a.css'], { encoding: 'utf8', cwd: dir });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /^a\.css:2 literal-spacing allowed \(finding at line 3\): optical nudge\na\.css:4 literal-color allowed \(finding at line 5\): brand swatch$/m);
      assert.match(r.stdout, /^rules:check: 1 path\(s\), no violations, 2 allowed exception\(s\)$/m);
    },

    'registry: a gate named only in a comment or a string, never called, fails'() {
      const bare = path.join(tmp, 'mention-root');
      fs.mkdirSync(path.join(bare, 'tokens/lib'), { recursive: true });
      fs.writeFileSync(path.join(bare, 'tokens/build.mjs'), "import { systemGate } from './lib/system.mjs';\n// systemGate(tokens) is called here, honest\n/* systemGate( */\nconst s = 'systemGate(x)';\n");
      fs.writeFileSync(path.join(bare, 'tokens/check.mjs'), '// nothing\n');
      fs.copyFileSync(path.join(TOKENS, 'lib/system.mjs'), path.join(bare, 'tokens/lib/system.mjs'));
      const ctx = { root: bare, names: new Set(rules().map((r) => r.check?.test)), artifact: [] };
      const only = (l) => { l.length = 0; l.push(rules().find((r) => r.id === 'hit-target-token')); };
      assert.deepEqual(registryProblems(withRule(only), ctx), ['rules registry: hit-target-token check ref does not resolve: systemGate is not called by tokens/build.mjs, tokens/check.mjs or a module they import']);
      fs.appendFileSync(path.join(bare, 'tokens/build.mjs'), 'systemGate(tokens, doc, where);\n');
      assert.deepEqual(registryProblems(withRule(only), ctx), []);
    },
  };
}
