// Score cells: every cell dir under eval/results/<runId>/ that holds a meta.json. Writes scores.json beside each.
import fs from 'node:fs';
import path from 'node:path';
import { RESULTS, SCORERS, readJson, scenarioById } from './common.mjs';
import { kitOnly, literals, typecheck, catalog } from './scorers.mjs';
import { render, startRender } from './render.mjs';

const STATIC = { 'kit-only': kitOnly, literals, typecheck, catalog };
const ZERO = { score: 0, pass: false, details: ['no solution.tsx was written'] };

export async function scoreCell(dir, scenario, rs) {
  const out = {};
  if (!fs.existsSync(path.join(dir, 'solution.tsx'))) {
    for (const s of SCORERS) out[s] = ZERO;
  } else {
    for (const [name, fn] of Object.entries(STATIC)) out[name] = fn(dir);
    out.render = await render(rs, dir, scenario);
  }
  out.total = SCORERS.reduce((a, s) => a + out[s].score, 0) / SCORERS.length;
  fs.writeFileSync(path.join(dir, 'scores.json'), JSON.stringify(out, null, 2));
  return out;
}

export async function scoreRun(runId, { only } = {}) {
  const root = path.join(RESULTS, runId);
  const cells = fs.readdirSync(root).filter((c) => fs.existsSync(path.join(root, c, 'meta.json'))).filter((c) => !only || only(c));
  const rs = await startRender();
  try {
    for (const c of cells) {
      const dir = path.join(root, c);
      const meta = readJson(path.join(dir, 'meta.json'));
      const s = await scoreCell(dir, scenarioById(meta.scenario) ?? { steps: [] }, rs);
      console.log(`${c.padEnd(44)} ${SCORERS.map((n) => s[n].score.toFixed(2)).join(' ')}  total ${s.total.toFixed(2)}`);
    }
  } finally {
    await rs.close();
  }
  return cells;
}
