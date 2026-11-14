#!/usr/bin/env node
// node tokens/motion.test.mjs [--source <dir>]
// The promoted springs equal the dialled constants in src/motion.ts: in the token source,
// in the generated Motion module and in the generated Swift. --source reads base/ and brands/
// from another folder (tokens/test.mjs seeds a changed spring this way). Run by tokens/test.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO, TOKENS, loadBrand } from './lib/source.mjs';

// Promoted spring -> the constant it was dialled as. A spring that is not in this list must not be in the source.
const DIALLED = {
  'iris-open': 'DEFAULT_OPEN_SPRING',
  'iris-close': 'DEFAULT_CLOSE_SPRING',
  'iris-shared-open': 'DEFAULT_SHARED_SPRING',
  'iris-shared-close': 'DEFAULT_SHARED_CLOSE_SPRING',
  'iris-snap': 'SNAP_SPRING',
};

const args = process.argv.slice(2);
const source = args[0] === '--source' && args[1] ? path.resolve(args[1]) : TOKENS;

// src/motion.ts is TypeScript; each constant is a plain object literal, so read the literal.
const motionTs = fs.readFileSync(path.join(REPO, 'src/motion.ts'), 'utf8');
function constant(name) {
  const m = new RegExp(`export const ${name}(?::\\s*Spring)?\\s*=\\s*(\\{[^}]*\\})`).exec(motionTs);
  assert.ok(m, `src/motion.ts has no object constant ${name}`);
  return new Function(`return ${m[1]}`)();
}
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const numbers = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('$')));

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'orrery-motion-test-'));
let failed = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`ok    ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}\n      ${String(e.message).split('\n').join('\n      ')}`);
  }
};

try {
  const stored = loadBrand('orrery', null, source).modes[0].doc.$extensions['com.orrery'].motion.spring;
  check('only the dialled springs are promoted', () => assert.deepEqual(Object.keys(stored).sort(), Object.keys(DIALLED).sort()));
  for (const [name, constName] of Object.entries(DIALLED)) {
    check(`source: ${name} equals ${constName}`, () => assert.deepEqual(numbers(stored[name] ?? {}), constant(constName), `${name} differs from src/motion.ts ${constName}`));
  }

  const build = spawnSync(process.execPath, [path.join(TOKENS, 'build.mjs'), '--source', source, '--out', out], { encoding: 'utf8' });
  check('the source builds', () => assert.equal(build.status, 0, build.stderr));
  if (build.status === 0) {
    const web = await import(pathToFileURL(path.join(out, 'js/orrery.motion.mjs')));
    const swift = fs.readFileSync(path.join(out, 'swift/OrreryTokens.swift'), 'utf8');
    for (const [name, constName] of Object.entries(DIALLED)) {
      const c = constant(constName);
      check(`web: ${camel(name)} is the Motion transition for ${constName}`, () => assert.deepEqual(web[camel(name)], { type: 'spring', ...c }, `${name} differs from src/motion.ts ${constName}`));
      check(`swift: ${camel(name)} carries ${constName} (mass 1 when the constant has none)`, () => {
        const line = `public static let ${camel(name)} = OrrerySpring(mass: ${c.mass ?? 1}, stiffness: ${c.stiffness}, damping: ${c.damping})`;
        assert.ok(swift.includes(line), `${name} differs from src/motion.ts ${constName}: generated Swift has no line\n${line}`);
      });
    }
  }
} finally {
  fs.rmSync(out, { recursive: true, force: true });
}
console.log(`tokens/motion.test.mjs: ${failed ? `${failed} failed` : 'all passed'}`);
process.exit(failed ? 1 : 0);
