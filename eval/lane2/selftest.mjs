// Lane-2 half of `npm run eval:selftest` (no model spend): brand.css matches the token build; one positive control per
// condition scores 1.00 on every headline scorer (so a condition's harness cannot be what sinks it); each bad fixture in
// eval/fixtures/lane2/bad/<scorer>/ fails the scorer it is named for.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BRAND_CSS, CONDITIONS, EVAL, HEADLINE, allScenarios, buildBrandCss } from './common.mjs';
import { scoreLane2Cell } from './score.mjs';
import { startLane2 } from './render.mjs';

const FIX = path.join(EVAL, 'fixtures/lane2');

export async function selftestLane2(fail) {
  console.log('lane 2: brand.css');
  if (fs.readFileSync(BRAND_CSS, 'utf8') !== buildBrandCss()) fail('eval/fixtures/conditions/shared/brand.css is stale (node eval/lane2/build-brand.mjs)');
  else console.log('  in sync with tokens/generated/css');
  const confirm = allScenarios().find((s) => s.id === 'confirm-delete');
  const full = fs.mkdtempSync(path.join(os.tmpdir(), 'lane2-selftest-'));
  const rs = await startLane2();
  try {
    console.log('lane 2: positive controls, scenario confirm-delete (expect 1.00 on every headline scorer)');
    for (const condition of CONDITIONS) {
      const s = await scoreLane2Cell(rs, { id: `selftest-good-${condition}`, srcDir: path.join(FIX, 'good', condition), condition, scenario: confirm, shotsDir: path.join(full, `good-${condition}`), fullDir: path.join(full, `good-${condition}-full`) });
      console.log(`  ${condition.padEnd(7)} ${HEADLINE.map((n) => `${n} ${s[n].score.toFixed(2)}`).join('  ')}`);
      for (const n of HEADLINE) if (s[n].score !== 1) fail(`lane-2 control ${condition} scored ${s[n].score.toFixed(2)} on ${n}: ${s[n].details.join(' | ')}`);
    }
    console.log('lane 2: bad fixtures, bare condition (expect the named scorer to fail)');
    for (const n of HEADLINE) {
      const scenario = n === 'keyboard' ? confirm : { id: 'none', steps: [] };
      const s = await scoreLane2Cell(rs, { id: `selftest-bad-${n}`, srcDir: path.join(FIX, 'bad', n), condition: 'bare', scenario, shotsDir: path.join(full, `bad-${n}`), fullDir: path.join(full, `bad-${n}-full`) });
      console.log(`  ${n.padEnd(10)} score ${s[n].score.toFixed(2)} pass ${s[n].pass}  ${s[n].details[0] ?? ''}`);
      if (s[n].pass || s[n].score >= 1) fail(`lane-2 bad fixture for ${n} did not fail it`);
    }
  } finally {
    await rs.close();
    fs.rmSync(full, { recursive: true, force: true });
  }
}
