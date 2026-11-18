#!/usr/bin/env node
// npm run eval:selftest   No model spend. Proves the scorers: every scenario reference scores full marks on all five, and each
// bad fixture (eval/fixtures/bad/<scorer>.tsx) fails the scorer it was written for.
import fs from 'node:fs';
import path from 'node:path';
import { EVAL, RESULTS, SCORERS, scenarios } from './lib/common.mjs';
import { scoreCell } from './lib/score.mjs';
import { startRender } from './lib/render.mjs';

const root = path.join(RESULTS, 'selftest');
fs.rmSync(root, { recursive: true, force: true });
const rs = await startRender();
let failures = 0;
const fail = (msg) => { failures++; console.log(`FAIL ${msg}`); };

function stage(id, from, meta) {
  const dir = path.join(root, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(from, path.join(dir, 'solution.tsx'));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta));
  return dir;
}

try {
  console.log('references (expect 1.00 on every scorer)');
  for (const sc of scenarios()) {
    const dir = stage(`ref-${sc.id}`, path.join(EVAL, 'scenarios', sc.id, 'reference.tsx'), { scenario: sc.id });
    const s = await scoreCell(dir, sc, rs);
    console.log(`  ${sc.id.padEnd(18)} ${SCORERS.map((n) => `${n} ${s[n].score.toFixed(2)}`).join('  ')}`);
    for (const n of SCORERS) if (s[n].score !== 1) fail(`reference ${sc.id} scored ${s[n].score.toFixed(2)} on ${n}: ${s[n].details.join(' | ')}`);
  }
  console.log('bad fixtures (expect the named scorer to fail)');
  for (const n of SCORERS) {
    const dir = stage(`bad-${n}`, path.join(EVAL, 'fixtures/bad', `${n}.tsx`), { scenario: null });
    const s = await scoreCell(dir, { steps: [] }, rs);
    console.log(`  ${n.padEnd(10)} score ${s[n].score.toFixed(2)} pass ${s[n].pass}  ${s[n].details[0] ?? ''}`);
    if (s[n].pass || s[n].score >= 1) fail(`bad fixture for ${n} did not fail it`);
  }
} finally {
  await rs.close();
}
console.log(failures === 0 ? 'SELFTEST OK' : `SELFTEST FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
