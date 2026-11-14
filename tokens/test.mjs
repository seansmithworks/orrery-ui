#!/usr/bin/env node
// node tokens/test.mjs: every tokens gate passes on the real tree and fails on a seeded bad input.
// Seeds live in temp folders; nothing in the repo is changed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO, TOKENS } from './lib/source.mjs';
import { colorGate, snapshotGate, cssGate, headOutput } from './lib/gates.mjs';
import { checkTests } from './test-checks.mjs';

const SNAPSHOT = path.join(REPO, 'artifact/snapshot');
const BRAND = path.join(REPO, 'artifact/brands/example.tokens.json');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orrery-tokens-test-'));
const run = (script, ...args) => spawnSync(process.execPath, [path.join(TOKENS, script), ...args], { encoding: 'utf8' });

// A copy of the Artifact snapshot with one change to tokens.json.
function seededSnapshot(name, change) {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir);
  fs.copyFileSync(path.join(SNAPSHOT, 'bundle.css'), path.join(dir, 'bundle.css'));
  const tok = JSON.parse(fs.readFileSync(path.join(SNAPSHOT, 'tokens.json'), 'utf8'));
  change(tok);
  fs.writeFileSync(path.join(dir, 'tokens.json'), JSON.stringify(tok));
  return dir;
}

// A copy of the token source (base/ and brands/) with one text change in one file.
function seededSource(name, file, from, to) {
  const src = path.join(tmp, name);
  fs.cpSync(path.join(TOKENS, 'base'), path.join(src, 'base'), { recursive: true });
  fs.cpSync(path.join(TOKENS, 'brands'), path.join(src, 'brands'), { recursive: true });
  const text = fs.readFileSync(path.join(src, file), 'utf8');
  assert.equal(text.split(from).length, 2, `${file} should hold ${from} exactly once`);
  fs.writeFileSync(path.join(src, file), text.replace(from, to));
  return src;
}

const tests = {
  'real tree: tokens:check passes'() {
    const r = run('check.mjs');
    assert.equal(r.status, 0, r.stderr);
  },

  'snapshot gate: a changed snapshot value fails, naming the key'() {
    // usage text is in the contract but not in the CSS, so only this gate may fail.
    const r = run('check.mjs', '--snapshot', seededSnapshot('usage', (tok) => { tok.color.tokens[0].usage += ' (seeded)'; }));
    assert.equal(r.status, 1);
    assert.match(r.stderr, /^snapshot mismatch: tokens\/generated\/tokens\.json vs .*tokens\.json: first difference at color\.tokens\.0\.usage: /m);
    assert.doesNotMatch(r.stderr, /head\.py mismatch/);
  },

  'head.py gate: a changed color fails with no brand and with the brand, naming the declaration'() {
    const r = run('check.mjs', '--snapshot', seededSnapshot('page', (tok) => { tok.color.tokens.find((t) => t.name === 'page').value.light = '#fffffe'; }));
    assert.equal(r.status, 1);
    assert.match(r.stderr, /^head\.py mismatch: tokens\/generated\/css\/orrery\.css vs artifact\/head\.py: first difference at :root \| --page: generated "#ffffff", head\.py "#fffffe"$/m);
    assert.match(r.stderr, /^head\.py mismatch: tokens\/generated\/css\/northwind-kiln\.css vs artifact\/head\.py --brand artifact\/brands\/example\.tokens\.json: first difference at :root \| --page: /m);
  },

  'head.py gate alone: generated CSS that drifts from head.py fails while the snapshot gate passes'() {
    const contract = JSON.parse(fs.readFileSync(path.join(TOKENS, 'generated/tokens.json'), 'utf8'));
    assert.equal(snapshotGate(contract, JSON.parse(fs.readFileSync(path.join(SNAPSHOT, 'tokens.json'), 'utf8')), 'artifact/snapshot/tokens.json'), null);
    for (const [name, brand] of [['orrery', null], ['northwind-kiln', BRAND]]) {
      const css = fs.readFileSync(path.join(TOKENS, `generated/css/${name}.css`), 'utf8');
      const head = headOutput(SNAPSHOT, brand);
      assert.equal(cssGate(css, head, `css/${name}.css`, 'head.py'), null);
      const changed = cssGate(css.replace('--space-8: 8px;', '--space-8: 9px;'), head, `css/${name}.css`, 'head.py');
      assert.match(changed, /first difference at :root \| --space-8: generated "9px", head\.py "8px"$/);
      const dropped = cssGate(css.replace('  --radius-panel: 10px;\n', ''), head, `css/${name}.css`, 'head.py');
      assert.match(dropped, /first difference at :root \| --radius-panel: generated missing, head\.py "10px"$/);
    }
  },

  'color gate: hex and components that disagree fail, naming the token'() {
    const srgb = (components, hex) => ({ colorSpace: 'srgb', components, hex });
    const shadow = (color) => [{ color, offsetX: { value: 0, unit: 'px' }, offsetY: { value: 1, unit: 'px' }, blur: { value: 2, unit: 'px' }, spread: { value: 0, unit: 'px' } }];
    assert.deepEqual(colorGate({ 'color.accent': { type: 'color', value: srgb([0.1216, 0.3725, 0.5451], '#1F5F8B') }, 'shadow.lift': { type: 'shadow', value: shadow({ colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.05 }) } }, 'test'), []);
    const bad = colorGate({ 'color.accent': { type: 'color', value: srgb([1, 0, 0], '#00ff00') }, 'shadow.lift': { type: 'shadow', value: shadow(srgb([0, 0, 0], '#000001')) } }, 'brand orrery, mode light');
    assert.equal(bad.length, 2);
    assert.match(bad[0], /^color mismatch: color\.accent \(brand orrery, mode light\): hex #00ff00 does not match components \[1,0,0\] \(#ff0000\)$/);
    assert.match(bad[1], /^color mismatch: shadow\.lift /);
  },

  'build: exits 1 and writes nothing when a color in the source has a hex that disagrees with its components'() {
    const src = path.join(tmp, 'bad-source');
    fs.cpSync(path.join(TOKENS, 'base'), path.join(src, 'base'), { recursive: true });
    fs.cpSync(path.join(TOKENS, 'brands'), path.join(src, 'brands'), { recursive: true });
    const light = path.join(src, 'brands/orrery/modes/light.tokens.json');
    const text = fs.readFileSync(light, 'utf8');
    assert.ok(text.includes('"hex": "#ffffff"'));
    fs.writeFileSync(light, text.replace('"hex": "#ffffff"', '"hex": "#fffffe"'));
    const out = path.join(tmp, 'bad-out');
    const r = run('build.mjs', '--source', src, '--out', out);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /^color mismatch: .*hex #fffffe does not match components/m);
    assert.equal(fs.existsSync(out), false);
  },

  'build: --out with no value is a usage error'() {
    const r = run('build.mjs', '--out');
    assert.equal(r.status, 2);
    assert.match(r.stderr, /^usage: node tokens\/build\.mjs \[--out <dir>\]$/m);
  },

  'build: stale files in a previous build are removed, a foreign folder is refused untouched, and an --out inside the repo is refused'() {
    const out = path.join(tmp, 'out');
    assert.equal(run('build.mjs', '--out', out).status, 0);
    fs.mkdirSync(path.join(out, 'css/old'), { recursive: true });
    for (const f of ['stale.txt', 'css/retired-brand.css', 'css/old/deep.css']) fs.writeFileSync(path.join(out, f), 'stale');
    const r = run('build.mjs', '--out', out);
    assert.equal(r.status, 0, r.stderr);
    const files = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile()).sort();
    assert.deepEqual(files, ['.orrery-tokens-build', 'checks.md', 'css/northwind-kiln.css', 'css/orrery.css', 'css/orrery.system.css', 'css/solar.css', 'css/solar.system.css', 'js/orrery.motion.mjs', 'swift/OrreryTokens.swift', 'tokens.json']);
    assert.equal(fs.existsSync(path.join(out, 'css/old')), false);
    const foreign = path.join(tmp, 'foreign');
    fs.mkdirSync(path.join(foreign, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(foreign, 'notes.txt'), 'mine');
    fs.writeFileSync(path.join(foreign, 'sub/a.md'), 'mine');
    const kept = run('build.mjs', '--out', foreign);
    assert.equal(kept.status, 2);
    assert.deepEqual(fs.readdirSync(foreign, { recursive: true }).sort(), ['notes.txt', 'sub', 'sub/a.md']);
    const refused = run('build.mjs', '--out', path.join(TOKENS, 'base'));
    assert.equal(refused.status, 2);
    assert.equal(fs.existsSync(path.join(TOKENS, 'base/core.tokens.json')), true);
  },

  'motion: the promoted springs equal src/motion.ts, and a changed spring fails naming it'() {
    const real = run('motion.test.mjs');
    assert.equal(real.status, 0, real.stdout + real.stderr);
    const r = run('motion.test.mjs', '--source', seededSource('spring', 'base/motion.tokens.json', '"damping": 42.5', '"damping": 43'));
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^FAIL  source: iris-open equals DEFAULT_OPEN_SPRING$/m);
    assert.match(r.stdout, /^FAIL  web: irisOpen /m);
    assert.doesNotMatch(r.stdout, /^FAIL  .*iris-close/m);
  },

  'hit target: a value under 44 fails the build, naming the token, and writes nothing'() {
    const out = path.join(tmp, 'hit-out');
    const r = run('build.mjs', '--source', seededSource('hit', 'base/scales.tokens.json', '"value": 44,', '"value": 40,'), '--out', out);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /^hit target too small: target\.hit-target-min \(brand orrery, mode light\) is 40px; the floor is 44px$/m);
    assert.equal(fs.existsSync(out), false);
  },
  'spring: a spring with a field that has no conversion rule fails the build, naming the spring, and writes nothing'() {
    const out = path.join(tmp, 'spring-out');
    const r = run('build.mjs', '--source', seededSource('spring-rule', 'base/motion.tokens.json', '"damping": 42.5,', '"damping": 42.5,\n            "bounce": 0.2,'), '--out', out);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /^spring not converted: iris-open \(brand orrery, mode light\) has no conversion rule for \{ stiffness, damping, bounce, mass \}/m);
    assert.equal(fs.existsSync(out), false);
  },

  'elevation: a level that chooses shadow fails the build, naming the level, and writes nothing'() {
    const out = path.join(tmp, 'shadow-out');
    const r = run('build.mjs', '--source', seededSource('elev-shadow', 'brands/orrery/elevation.tokens.json', '"draw": "fill"', '"draw": "shadow"'), '--out', out);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /^elevation not drawn: elevation\.level-0 \(brand orrery, mode light\) chooses "shadow"/m);
    assert.equal(fs.existsSync(out), false);
  },

  'elevation: a part that is not an alias to a role fails the build, naming the part, and writes nothing'() {
    const out = path.join(tmp, 'alias-out');
    const literal = '{ "colorSpace": "srgb", "components": [1, 1, 1], "hex": "#ffffff" }';
    const r = run('build.mjs', '--source', seededSource('elev-alias', 'brands/orrery/elevation.tokens.json', '"$value": "{color.page}"', `"$value": ${literal}`), '--out', out);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /^elevation not drawn: elevation\.level-0\.fill \(brand orrery, mode light\) must point at a role/m);
    assert.equal(fs.existsSync(out), false);
  },

  ...checkTests({ tmp, run }),
};

let failed = 0;
try {
  for (const [name, fn] of Object.entries(tests)) {
    try {
      fn();
      console.log(`ok    ${name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${name}\n      ${String(e.message).split('\n').join('\n      ')}`);
    }
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(`tokens/test.mjs: ${Object.keys(tests).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
