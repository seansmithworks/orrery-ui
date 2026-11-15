#!/usr/bin/env node
// node example/kit-preview.test.mjs: kit-preview:check passes on the real tree, and goes red when a kit state
// rule changes without a rebuild. The seeds work on a temp copy of kit/; nothing in the repo is changed.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO, OUT, checkPreview } from './build-kit-preview.mjs';

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
