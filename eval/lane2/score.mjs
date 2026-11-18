#!/usr/bin/env node
// npm run eval:lane2:score -- [--only <substring>] [--force]
// Scores every cell under eval/results/lane-2/ that has a meta.json (skips cells with a scores.json unless --force).
// Headline scorers, the same for every condition: build, axe, keyboard, hit-target, brand. Lane 1's kit-only, literals
// and catalog run as secondary columns for orrery only. Thumbnails go to <cell>/shots/, full-size shots to L2_FULL.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND_CSS, HEADLINE, OUT, allScenarios, buildBrandCss, readJson } from './common.mjs';
import { brandLiterals, build, workCell } from './cell.mjs';
import { browse } from './browse.mjs';
import { startLane2 } from './render.mjs';
import { catalog, kitOnly, literals } from '../lib/scorers.mjs';

const FULL = process.env.L2_FULL ?? path.join(os.tmpdir(), 'lane-2-full');

export async function scoreLane2Cell(rs, { id, srcDir, condition, scenario, shotsDir, fullDir }) {
  const cell = workCell(id, srcDir, condition);
  const out = { build: build(cell, condition) };
  if (!cell.src.includes('solution.tsx')) {
    const z = { score: 0, pass: false, details: ['no solution.tsx was written'] };
    Object.assign(out, { axe: z, keyboard: z, 'hit-target': z, brand: z });
  } else {
    const b = await browse(rs, cell, condition, scenario, shotsDir, fullDir);
    const lit = brandLiterals(cell, condition);
    const litScore = 1 / (1 + lit.length);
    out.axe = b.axe;
    out.keyboard = b.keyboard;
    out['hit-target'] = b['hit-target'];
    out.brand = {
      score: (litScore + b.brandVisual.score) / 2,
      pass: lit.length === 0 && b.brandVisual.pass,
      details: [...b.brandVisual.details, ...lit.slice(0, 10)],
      literals: lit.length, ratios: b.brandVisual.ratios,
    };
    out.notes = b.notes;
    if (condition === 'orrery') out.secondary = { 'kit-only': kitOnly(cell.dir), literals: literals(cell.dir), catalog: catalog(cell.dir) };
  }
  out.total = HEADLINE.reduce((a, s) => a + out[s].score, 0) / HEADLINE.length;
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? null : process.argv[i + 1]; };
  if (fs.readFileSync(BRAND_CSS, 'utf8') !== buildBrandCss()) { console.error('brand.css is stale: run node eval/lane2/build-brand.mjs'); process.exit(2); }
  const byId = Object.fromEntries(allScenarios().map((s) => [s.id, s]));
  const cells = fs.readdirSync(OUT).filter((c) => fs.existsSync(path.join(OUT, c, 'meta.json')))
    .filter((c) => !arg('only') || c.includes(arg('only')))
    .filter((c) => process.argv.includes('--force') || !fs.existsSync(path.join(OUT, c, 'scores.json')));
  console.log(`${cells.length} cell(s) to score; full-size shots in ${FULL}`);
  const rs = await startLane2();
  try {
    for (const c of cells) {
      const meta = readJson(path.join(OUT, c, 'meta.json'));
      const t0 = Date.now();
      const s = await scoreLane2Cell(rs, { id: c, srcDir: path.join(OUT, c, 'src'), condition: meta.condition, scenario: byId[meta.scenario], shotsDir: path.join(OUT, c, 'shots'), fullDir: path.join(FULL, c) });
      fs.writeFileSync(path.join(OUT, c, 'scores.json'), JSON.stringify(s, null, 2) + '\n');
      console.log(`${c.padEnd(40)} ${HEADLINE.map((n) => `${n} ${s[n].score.toFixed(2)}`).join('  ')}  total ${s.total.toFixed(2)}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  } finally {
    await rs.close();
  }
}
