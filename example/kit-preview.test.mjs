#!/usr/bin/env node
// node example/kit-preview.test.mjs: kit-preview:check passes on the real tree, and goes red when a kit state
// rule changes without a rebuild. The seeds work on a temp copy of kit/; nothing in the repo is changed.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO, OUT, buildPreview, checkPreview } from './build-kit-preview.mjs';

const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'orrery-kit-preview-test-')));
const SCRIPT = path.join(REPO, 'example', 'build-kit-preview.mjs');

// A temp copy of kit/ with one text change in one file. Returns the copy's kit.css.
function seededKit(name, file, from, to) {
  const kit = path.join(tmp, name, 'kit');
  fs.cpSync(path.join(REPO, 'kit'), kit, { recursive: true });
  const target = path.join(kit, file);
  const text = fs.readFileSync(target, 'utf8');
  assert.equal(text.split(from).length, 2, `${file} should hold ${from} exactly once`);
  fs.writeFileSync(target, text.replace(from, to));
  return path.join(kit, 'kit.css');
}
// A temp kit whose kit.css is the given text. Returns its path.
function cssKit(name, css) {
  const kit = path.join(tmp, name, 'kit');
  fs.mkdirSync(kit, { recursive: true });
  fs.writeFileSync(path.join(kit, 'kit.css'), css);
  return path.join(kit, 'kit.css');
}
const runCheck = (...args) => spawnSync(process.execPath, [SCRIPT, '--check', ...args], { encoding: 'utf8' });

const tests = {
  'real tree: kit-preview:check passes'() {
    assert.deepEqual(checkPreview(), []);
    const r = runCheck();
    assert.equal(r.status, 0, r.stderr);
  },

  'a changed state rule with no rebuild: kit-preview:check fails, naming the file'() {
    // The pressed button gains a new exclusion in the shipped CSS; the committed preview still lacks it.
    const entry = seededKit(
      'state-rule',
      'button/button.css',
      '.orr-button:not([data-disabled]):active {',
      '.orr-button:not([data-disabled], [data-loading]):active {',
    );
    const r = runCheck('--kit', entry, '--out', OUT);
    assert.equal(r.status, 1, `expected exit 1, got ${r.status}\n${r.stdout}`);
    assert.match(r.stderr, /^kit-preview: example\/kit-preview\.css differs from a fresh build/m);
  },

  'a state pseudo-class with no decision (:focus): the build throws, naming the file and the selector'() {
    const entry = seededKit('unknown-state', 'button/button.css', ':not([data-disabled]):hover {', ':not([data-disabled]):focus {');
    assert.throws(
      () => buildPreview(entry),
      (e) => /kit\/button\/button\.css/.test(e.message) && e.message.includes('.orr-button:not([data-disabled]):focus') && /:focus\b/.test(e.message),
    );
  },

  'a negated state (:not(:hover)): the build throws, naming the selector'() {
    const entry = seededKit('negated-state', 'button/button.css', ':not([data-disabled]):hover {', ':not(:hover) {');
    assert.throws(
      () => buildPreview(entry),
      (e) => e.message.includes('.orr-button:not(:hover)') && /:hover inside a functional pseudo-class/.test(e.message),
    );
  },

  'a state rule in an at-rule the generator does not descend into (@scope): the build throws, naming the selector'() {
    const entry = seededKit('unknown-at-rule', 'button/button.css', '@media (hover: hover) {', '@scope (.orr-button) {');
    assert.throws(
      () => buildPreview(entry),
      (e) => e.message.includes('.orr-button:not([data-disabled]):hover') && e.message.includes('@scope (.orr-button)'),
    );
  },

  'a nested state rule (&:hover inside a rule): the build throws, naming the selector'() {
    const entry = seededKit(
      'nested-state',
      'button/button.css',
      '.orr-button:not([data-disabled]):hover {\n      --orr-mix: var(--orr-hover-mix);\n    }',
      '.orr-button {\n      &:hover {\n        --orr-mix: var(--orr-hover-mix);\n      }\n    }',
    );
    assert.throws(
      () => buildPreview(entry),
      (e) => e.message.includes('&:hover') && e.message.includes('kit/button/button.css'),
    );
  },
  'structural pseudo-classes alone: the build passes and makes no twin'() {
    const entry = cssKit('structural', '.a:first-child, .b:nth-child(2 of .x), .c:empty, .d:where(.e):has(.f) { color: red; }\n');
    assert.ok(!buildPreview(entry).includes('/* kit/kit.css */'));
  },

  'a structural pseudo-class beside a state: the twin keeps the structure'() {
    const entry = cssKit('structural-state', '.a:nth-child(2):hover { color: red; }\n');
    assert.ok(buildPreview(entry).includes('.a:nth-child(2)[data-preview~="hover"] {'));
  },

  'a state inside :where() or :has(): the build throws, naming the selector'() {
    for (const sel of ['.a:where(:hover)', '.a:has(:focus-visible)', '.a:nth-child(2 of :hover)']) {
      assert.throws(
        () => buildPreview(cssKit('functional-state', `${sel} { color: red; }\n`)),
        (e) => e.message.includes(`"${sel}"`) && /functional pseudo-class/.test(e.message),
        sel,
      );
    }
  },

  'a state inside a pseudo-element argument (::slotted(:hover)): the build throws, naming the selector'() {
    assert.throws(
      () => buildPreview(cssKit('slotted-state', '.a::slotted(:hover) { color: red; }\n')),
      (e) => e.message.includes('"::slotted(:hover)"') || e.message.includes('.a::slotted(:hover)'),
    );
  },
  'quotes and brackets hide parens and pseudo-classes: strings are never scanned'() {
    const twin = (sel) => buildPreview(cssKit('opaque-twin', `${sel} { color: red; }\n`));
    const none = (sel) => buildPreview(cssKit('opaque-none', `${sel} { color: red; }\n`));
    const throwsOn = (sel) =>
      assert.throws(() => buildPreview(cssKit('opaque-throw', `${sel} { color: red; }\n`)), (e) => e.message.includes(sel), sel);
    // A ")" or "(" inside an attribute string no longer ends or opens the :not() arguments.
    assert.ok(twin('.a:not([x=")"]):hover').includes('.a:not([x=")"])[data-preview~="hover"] {'));
    assert.ok(twin(".a:not([x=')']):hover").includes(`.a:not([x=')'])[data-preview~="hover"] {`));
    assert.ok(twin('.a:not([x="("]):hover').includes('.a:not([x="("])[data-preview~="hover"] {'));
    assert.ok(twin(".a:not([x='(']):hover").includes(`.a:not([x='('])[data-preview~="hover"] {`));
    assert.ok(twin('.a:not([x="a\\")"]):hover').includes('.a:not([x="a\\")"])[data-preview~="hover"] {'));
    // A state after a quoted ")" inside :has() is still seen, and throws.
    throwsOn('.a:has(.b[x=")"]:hover)');
    throwsOn(".a:has(.b[x=')']:hover)");
    throwsOn('.a:has(.b[x="a\\")"]:hover)');
    // ":hover" and ":focus" inside strings are text, not states: no throw, no twin.
    for (const sel of ['.a[x=":hover"]:where([y="):focus"])', ".a[x=':hover']:where([y='):focus'])"]) {
      assert.ok(!none(sel).includes('/* kit/kit.css */'), sel);
    }
  },
  'a "/*" inside a string is not a comment; real comments between rules and in selector lists still are'() {
    const build = (css) => buildPreview(cssKit('comments', `${css}\n`));
    const a = build('.a[x="/*"]:hover{x:1} /* c */ .b:hover{y:1}');
    assert.ok(a.includes('.a[x="/*"][data-preview~="hover"] {') && a.includes('.b[data-preview~="hover"] {'), a);
    const b = build('.a:hover{content:"/*"} /* end */ .b:hover{y:1}');
    assert.ok(b.includes('content:"/*"') && b.includes('.b[data-preview~="hover"] {'), b);
    const c = build('.a:hover, /* c */ .b:hover { y: 1 } /* between */ .c:hover { z: 1 }');
    assert.ok(/\.a\[data-preview~="hover"\],\n\.b\[data-preview~="hover"\] \{/.test(c) && c.includes('.c[data-preview~="hover"] {'), c);
    // Whitespace inside a string survives; a quote inside a comment does not open a string.
    const d = build(`/* it's */ .a[x="p  q"]:hover { y: 1 }`);
    assert.ok(d.includes('.a[x="p  q"][data-preview~="hover"] {'), d);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n${e.message}`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`kit-preview test: ${Object.keys(tests).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);