// Tests for the build-time checks (lock list, opt-outs, required roles, contrast). Run by tokens/test.mjs.
// Every seed is a temp copy of base/ and brands/ built with --source; nothing in the repo is changed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO, TOKENS } from './lib/source.mjs';
import { checker, setPaths, unlocks, contrastRatio } from './lib/checks.mjs';

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const PAIRS = readJson(path.join(TOKENS, 'checks/contrast.pairs.json'));
const SCHEMA = readJson(path.join(TOKENS, 'checks/brand.schema.json'));
// scale-2 light (#c7c7cc): as text-muted it sits 1.68:1 on the white page.
const TOO_PALE = { colorSpace: 'srgb', components: [0.7804, 0.7804, 0.8], hex: '#c7c7cc' };

export function checkTests({ tmp, run }) {
  let n = 0;
  // A temp source copy; `change` gets the folder and an edit(relative file, fn) helper.
  function seeded(change) {
    const src = path.join(tmp, `checks-src-${++n}`);
    for (const d of ['base', 'brands']) fs.cpSync(path.join(TOKENS, d), path.join(src, d), { recursive: true });
    const edit = (rel, fn) => {
      const f = path.join(src, rel), doc = readJson(f);
      fn(doc);
      fs.writeFileSync(f, JSON.stringify(doc, null, 2));
    };
    change(edit, src);
    const out = path.join(tmp, `checks-out-${n}`);
    return { out, r: run('build.mjs', '--source', src, '--out', out) };
  }
  const brandExt = (doc) => doc.$extensions['com.orrery'];
  const paleMuted = (edit) => edit('brands/orrery/modes/light.tokens.json', (d) => { d.color['text-muted'].$value = TOO_PALE; });
  // A second product brand: brand orrery's files under another name.
  const addBrand = (edit, src, name, change = () => {}) => {
    fs.cpSync(path.join(src, 'brands/orrery'), path.join(src, 'brands', name), { recursive: true });
    edit(`brands/${name}/brand.tokens.json`, (d) => { brandExt(d).name = name; change(brandExt(d)); });
  };

  return {
    'checks: the real tree builds, and the report lists every pair for brand orrery in light and dark and flags the pre-existing failures'() {
      const { out, r } = seeded(() => {});
      assert.equal(r.status, 0, r.stderr);
      const report = fs.readFileSync(path.join(out, 'checks.md'), 'utf8');
      const orrery = report.split('### Brand orrery')[1].split('### Brand')[0];
      assert.match(orrery, /^\| Role \| On \| Kind \| Needs \| light \| dark \|$/m);
      for (const p of PAIRS.pairs) assert.match(orrery, new RegExp(`^\\| ${p.role} \\| ${p.surface} \\| ${p.kind} \\| ${PAIRS.required[p.kind]} \\| \\d+\\.\\d\\d( FAILS, opted out)? \\| \\d+\\.\\d\\d( FAILS, opted out)? \\|$`, 'm'));
      assert.match(orrery, /^\| color\.line-dashed \| color\.page \| ui \| 3 \| 2\.57 FAILS, opted out \| 3\.87 \|$/m);
      assert.match(report, /^- brand orrery: opt-out 1 \(contrast color\.line-dashed on color\.page, mode light\): pre-existing, pending Sean's review$/m);
      assert.match(report, /^### Brand northwind-kiln$/m);
    },

    '[contrast-aa-tokens] contrast: a text role set too close to its surface fails, naming brand, mode, both roles and both ratios, and writes nothing'() {
      const { out, r } = seeded(paleMuted);
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /^contrast: brand orrery, mode light: color\.text-muted on color\.page is 1\.68:1, needs 4\.5:1 \(text\)$/m);
      assert.match(r.stderr, /^contrast: brand orrery, mode light: color\.text-muted on color\.layer-1 is \d\.\d\d:1, needs 4\.5:1 \(text\)$/m);
      assert.doesNotMatch(r.stderr, /mode dark/);
      assert.equal(fs.existsSync(out), false);
    },

    'contrast: the ratio is the WCAG one, and a see-through color is laid over its surface first'() {
      const c = (...components) => ({ colorSpace: 'srgb', components });
      assert.equal(contrastRatio(c(0, 0, 0), c(1, 1, 1)), 21);
      assert.equal(contrastRatio(c(1, 1, 1), c(1, 1, 1)), 1);
      assert.equal(contrastRatio({ ...c(0, 0, 0), alpha: 0 }, c(1, 1, 1)), 1);
      // #767676 on white is the well-known 4.54:1.
      assert.equal(contrastRatio(c(0.4627, 0.4627, 0.4627), c(1, 1, 1)).toFixed(2), '4.54');
    },

    '[required-roles] source: required roles: a role missing from one mode fails, naming brand, mode and role'() {
      const { out, r } = seeded((edit) => edit('brands/orrery/modes/dark.tokens.json', (d) => { delete d.color['text-muted']; }));
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /^required role: brand orrery, mode dark: color\.text-muted is missing$/m);
      assert.doesNotMatch(r.stderr, /mode light/);
      assert.equal(fs.existsSync(out), false);
    },

    'required roles: the list is every leaf of base/roles.tokens.json, so a role added there is required at once'() {
      const { r } = seeded((edit) => edit('base/roles.tokens.json', (d) => { d.color['seeded-role'] = { $description: 'Seeded.' }; }));
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /^required role: brand orrery, mode light: color\.seeded-role is missing$/m);
      assert.match(r.stderr, /^required role: brand orrery, mode dark: color\.seeded-role is missing$/m);
    },

    '[brand-lock] locks: lock list: a brand that inherits the default list and sets a locked path fails, naming brand and path'() {
      const { out, r } = seeded((edit, src) => addBrand(edit, src, 'acme', (e) => { delete e.unlocked; }));
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /^lock: brand acme sets locked path color\.page in modes\/light\.tokens\.json \(it may set: color\.accent, color\.on-accent, font\.sans\)$/m);
      assert.match(r.stderr, /^lock: brand acme sets locked path font\.mono in brand\.tokens\.json /m);
      assert.doesNotMatch(r.stderr, /locked path (color\.accent|color\.on-accent|font\.sans) /);
      assert.doesNotMatch(r.stderr, /brand orrery/);
      assert.equal(fs.existsSync(out), false);
    },

    'lock list: a brand that unlocks everything passes and is checked like brand orrery; its own narrower list is enforced'() {
      const open = seeded((edit, src) => addBrand(edit, src, 'acme'));
      assert.equal(open.r.status, 0, open.r.stderr);
      assert.match(fs.readFileSync(path.join(open.out, 'checks.md'), 'utf8'), /^### Brand acme$/m);
      const narrow = seeded((edit, src) => addBrand(edit, src, 'acme', (e) => { e.unlocked = ['color.*', 'elevation.*', 'font.sans', 'shadow.*']; }));
      assert.equal(narrow.r.status, 1, narrow.r.stderr);
      assert.deepEqual(narrow.r.stderr.trim().split('\n'), ['lock: brand acme sets locked path font.mono in brand.tokens.json (it may set: color.*, elevation.*, font.sans, shadow.*)']);
    },

    'lock list: the default list is exactly what the real client brand file sets, and head.py still accepts that file'() {
      const example = setPaths(readJson(path.join(REPO, 'artifact/brands/example.tokens.json')));
      assert.deepEqual(example.sort(), [...SCHEMA.defaultUnlocked].sort());
      assert.equal(unlocks(SCHEMA.defaultUnlocked, 'color.page'), false);
      // The real build runs the file through head.py; a rejection would exit non-zero.
      const { out, r } = seeded(() => {});
      assert.equal(r.status, 0, r.stderr);
      assert.equal(fs.existsSync(path.join(out, 'css/northwind-kiln.css')), true);
    },

    '[opt-out-reasons] readOptOuts: opt-out: one with no reason fails, naming the brand and the opt-out'() {
      for (const reason of [undefined, '', '   ']) {
        const { out, r } = seeded((edit) => {
          paleMuted(edit);
          edit('brands/orrery/brand.tokens.json', (d) => brandExt(d).optOut.push({ check: 'contrast', role: 'color.text-muted', surface: 'color.page', mode: 'light', reason }));
        });
        assert.equal(r.status, 1, r.stderr);
        assert.match(r.stderr, /^opt-out: brand orrery: opt-out 3 \(contrast color\.text-muted on color\.page, mode light\) has no reason$/m);
        assert.equal(fs.existsSync(out), false);
      }
    },

    'opt-out: one with a reason lets that pair through, is listed in the report, and covers nothing else'() {
      const optOut = (surface) => ({ check: 'contrast', role: 'color.text-muted', surface, mode: 'light', reason: 'seeded reason' });
      const both = seeded((edit) => {
        paleMuted(edit);
        edit('brands/orrery/brand.tokens.json', (d) => brandExt(d).optOut.push(optOut('color.page'), optOut('color.layer-1')));
      });
      assert.equal(both.r.status, 0, both.r.stderr);
      const report = fs.readFileSync(path.join(both.out, 'checks.md'), 'utf8');
      assert.match(report, /^- brand orrery: opt-out 3 \(contrast color\.text-muted on color\.page, mode light\): seeded reason$/m);
      assert.match(report, /^\| color\.text-muted \| color\.page \| text \| 4\.5 \| 1\.68 FAILS, opted out \| 7\.64 \|$/m);
      const one = seeded((edit) => {
        paleMuted(edit);
        edit('brands/orrery/brand.tokens.json', (d) => brandExt(d).optOut.push(optOut('color.page')));
      });
      assert.equal(one.r.status, 1, one.r.stderr);
      assert.match(one.r.stderr, /^contrast: brand orrery, mode light: color\.text-muted on color\.layer-1 /m);
      assert.doesNotMatch(one.r.stderr, /on color\.page /);
    },

    'opt-out: a role opted out with a reason is not required and its pairs are skipped; with no reason it fails'() {
      const drop = (reason) => seeded((edit, src) => {
        addBrand(edit, src, 'acme', (e) => { e.optOut = [{ role: 'color.line-dashed', reason }]; });
        for (const m of ['light', 'dark']) edit(`brands/acme/modes/${m}.tokens.json`, (d) => { delete d.color['line-dashed']; });
      });
      const ok = drop('acme draws no dashed borders');
      assert.equal(ok.r.status, 0, ok.r.stderr);
      const report = fs.readFileSync(path.join(ok.out, 'checks.md'), 'utf8');
      assert.match(report, /^- brand acme: opt-out 1 \(role color\.line-dashed\): acme draws no dashed borders$/m);
      assert.match(report.split('### Brand acme')[1], /^\| color\.line-dashed \| color\.page \| ui \| 3 \| opted out \| opted out \|$/m);
      const bad = drop('');
      assert.equal(bad.r.status, 1, bad.r.stderr);
      assert.match(bad.r.stderr, /^opt-out: brand acme: opt-out 1 \(role color\.line-dashed\) has no reason$/m);
    },

    'opt-out: one that names an unknown check, pair or role fails instead of silently doing nothing'() {
      const cases = [
        [{ check: 'lock', reason: 'x' }, /opt-out 3 \(check lock\) names an unknown check \(known: contrast\)$/m],
        [{ check: 'contrast', role: 'color.text-muted', surface: 'color.layer-2', reason: 'x' }, /opt-out 3 \(contrast color\.text-muted on color\.layer-2\) names a pair that is not in tokens\/checks\/contrast\.pairs\.json$/m],
        [{ role: 'color.nope', reason: 'x' }, /opt-out 3 \(role color\.nope\) names a role that base\/roles\.tokens\.json does not require$/m],
      ];
      for (const [entry, line] of cases) {
        const { r } = seeded((edit) => edit('brands/orrery/brand.tokens.json', (d) => brandExt(d).optOut.push(entry)));
        assert.equal(r.status, 1, r.stderr);
        assert.match(r.stderr, line);
      }
    },

    'checks: the real source passes every check with no failure line'() {
      const checks = checker();
      assert.deepEqual(checks.locks(), []);
      assert.deepEqual(checks.brands, ['orrery', 'primetime', 'solar', 'trades']);
    },
  };
}
