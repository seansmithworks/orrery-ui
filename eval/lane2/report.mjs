#!/usr/bin/env node
// npm run eval:lane2:report   Tables from eval/results/lane-2/*/scores.json -> eval/results/lane-2.md and lane-2.json.
// The verdict paragraph is hand-written in eval/lane2/verdict.md (it reads the data; the data does not write it).
import fs from 'node:fs';
import path from 'node:path';
import { CONDITIONS, HEADLINE, LANE2, OUT, RESULTS, SECONDARY, allScenarios, readJson } from './common.mjs';

const cells = fs.readdirSync(OUT)
  .filter((c) => fs.existsSync(path.join(OUT, c, 'scores.json')))
  .map((c) => ({ id: c, meta: readJson(path.join(OUT, c, 'meta.json')), s: readJson(path.join(OUT, c, 'scores.json')) }));
const scen = allScenarios();
const NEW = new Set(scen.filter((s) => s.lane === 2).map((s) => s.id));
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const f2 = (v) => (v === null ? '-' : v.toFixed(2));
const sel = (f) => cells.filter(f);
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const cellMean = (cs, key = 'total') => `${f2(mean(cs.map((c) => (key === 'total' ? c.s.total : c.s[key].score))))} (${cs.length})`;
const passes = (cs, key) => `${cs.filter((c) => c.s[key].pass).length}/${cs.length}`;

const out = ['# Eval lane 2: with Orrery vs without', ''];
out.push(`${cells.length} scored runs: ${scen.length} scenarios x ${CONDITIONS.length} conditions x 3 reps, Sonnet via \`claude -p\` on the subscription, the same prompt for every condition. Scores are 0..1; a cell is the mean over its runs (n in brackets). Total = mean of the five headline scorers, which are the same for every condition.`, '');
out.push('- **orrery**: lane 1 `full` (kit, catalog, golden examples, DESIGN.md, rules registry, token CSS).');
out.push('- **bare**: React + TypeScript + plain CSS, and `brand.css` (the same brand variables).');
out.push('- **shadcn**: shadcn/ui (Radix + Tailwind v4) preinstalled, `brand.css` wired as the Tailwind theme.');
out.push('', 'Headline scorers: **build** (tsc, repo options), **axe** (no serious or critical violation in orrery-light, orrery-dark and solar, before and after the scenario steps), **keyboard** (every control reached by Tab, focus visibly changes it, and where the scenario has an overlay: Enter opens it, Escape closes it, focus returns to the trigger), **hit-target** (the 44px square from `--hit-target-min` centred on each control lands on that control, at 1280 and 375), **brand** (half: no hard-coded colour in the agent\'s files; half: at least 50% of the viewport changes from orrery light to dark and 30% from orrery dark to solar).', '');
out.push(`Scenarios with a golden-example twin in the kit (lane 1): ${scen.filter((s) => !NEW.has(s.id)).map((s) => s.id).join(', ')}. New, with no twin, composed from several components: ${[...NEW].join(', ')}.`, '');

out.push('## Total, scenario by condition', '');
out.push(table(['scenario', ...CONDITIONS], [
  ...scen.map((s) => [s.id + (NEW.has(s.id) ? ' (new)' : ''), ...CONDITIONS.map((c) => cellMean(sel((x) => x.meta.scenario === s.id && x.meta.condition === c)))]),
  ['lane-1 scenarios', ...CONDITIONS.map((c) => cellMean(sel((x) => !NEW.has(x.meta.scenario) && x.meta.condition === c)))],
  ['new scenarios', ...CONDITIONS.map((c) => cellMean(sel((x) => NEW.has(x.meta.scenario) && x.meta.condition === c)))],
  ['**all**', ...CONDITIONS.map((c) => `**${cellMean(sel((x) => x.meta.condition === c))}**`)],
]));

out.push('', '## By scorer, condition by scorer (all scenarios)', '', 'Mean score, then runs that passed outright.', '');
out.push(table(['condition', ...HEADLINE, 'total'], CONDITIONS.map((c) => {
  const cs = sel((x) => x.meta.condition === c);
  return [c, ...HEADLINE.map((h) => `${f2(mean(cs.map((x) => x.s[h].score)))} (${passes(cs, h)})`), f2(mean(cs.map((x) => x.s.total)))];
})));

// axe with and without aria-hidden-focus: Radix's modal menu sets aria-hidden on the app root while it traps focus in the
// menu, so axe flags it; whether that harms users is not verified here. Shown both ways so the rule's weight is visible.
const AHF = 'aria-hidden-focus';
const axeWithout = (x) => {
  if (x.s.axe.details.some((d) => /^load:|no solution/.test(d))) return x.s.axe.score;
  const failing = new Set(x.s.axe.details.filter((d) => !d.includes(AHF)).map((d) => d.split(':')[0]));
  return (3 - failing.size) / 3;
};
out.push('', `## axe with and without \`${AHF}\``, '', `Radix's modal dropdown menu sets \`aria-hidden\` on the app root while its buttons stay focusable; axe flags that as serious. Radix traps focus in the menu, so it may not affect users (unverified).`, '');
out.push(table(['condition', 'axe (all rules)', `axe without ${AHF}`, 'total (all rules)', `total without ${AHF}`], CONDITIONS.map((c) => {
  const cs = sel((x) => x.meta.condition === c);
  const tw = cs.map((x) => x.s.total + (axeWithout(x) - x.s.axe.score) / HEADLINE.length);
  return [c, `${f2(mean(cs.map((x) => x.s.axe.score)))} (${passes(cs, 'axe')})`, `${f2(mean(cs.map(axeWithout)))} (${cs.filter((x) => axeWithout(x) === 1).length}/${cs.length})`, f2(mean(cs.map((x) => x.s.total))), f2(mean(tw))];
})));

out.push('', '## Pass rate by scorer, scenario by condition', '');
out.push(table(['scenario', 'scorer', ...CONDITIONS], scen.flatMap((s) => HEADLINE.map((h) => [s.id, h, ...CONDITIONS.map((c) => passes(sel((x) => x.meta.scenario === s.id && x.meta.condition === c), h))]))));

const runStat = (cs, f) => mean(cs.map(f).filter((v) => typeof v === 'number'));
out.push('', '## Effort', '');
out.push(table(['condition', 'turns', 'wall s', 'CLI cost USD (mean)', 'CLI cost USD (sum)'], CONDITIONS.map((c) => {
  const cs = sel((x) => x.meta.condition === c);
  return [c, f2(runStat(cs, (x) => x.meta.run?.num_turns)), f2(runStat(cs, (x) => x.meta.wallMs / 1000)), runStat(cs, (x) => x.meta.run?.total_cost_usd)?.toFixed(3), cs.reduce((a, x) => a + (x.meta.run?.total_cost_usd ?? 0), 0).toFixed(2)];
})));
out.push('', 'Subscription auth: cost is the CLI\'s own estimate, not a bill.');

const orr = sel((x) => x.meta.condition === 'orrery' && x.s.secondary);
out.push('', '## Orrery only: lane-1 kit scorers (secondary, not in the total)', '');
out.push(table(['scenario', ...SECONDARY], scen.map((s) => [s.id, ...SECONDARY.map((k) => f2(mean(orr.filter((x) => x.meta.scenario === s.id).map((x) => x.s.secondary[k].score))))])));

// Failure details: the commonest messages per condition and scorer, with run-specific ids stripped.
const norm = (d) => d.replace(/#ui-sdk-[^ ,]*|#radix-[^ ,]*|:r[0-9a-z]+:|_r_[0-9a-z]+_|\d+ node\(s\)/g, '…').replace(/solution\.tsx\(\d+,\d+\)/, 'solution.tsx').replace(/:\d+ /, ' ');
out.push('', '## Failure details', '', 'Commonest failure messages per condition and scorer (count = runs showing it).', '');
for (const c of CONDITIONS) {
  out.push(`### ${c}`, '');
  for (const h of HEADLINE) {
    const failing = sel((x) => x.meta.condition === c && !x.s[h].pass);
    if (!failing.length) { out.push(`- **${h}**: no failures`); continue; }
    const counts = new Map();
    for (const x of failing) for (const d of new Set(x.s[h].details.map(norm))) counts.set(d, (counts.get(d) ?? 0) + 1);
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4);
    out.push(`- **${h}** (${failing.length} runs): ${top.map(([d, n]) => `${n}x ${d.replace(/\|/g, '/')}`).join('; ')}`);
  }
  out.push('');
}

out.push('## Every run', '');
out.push(table(['run', ...HEADLINE, 'total', 'turns', 'wall s', 'cost USD'], cells.map((x) => [
  x.id, ...HEADLINE.map((h) => f2(x.s[h].score)), f2(x.s.total), x.meta.run?.num_turns ?? '-', (x.meta.wallMs / 1000).toFixed(0), x.meta.run?.total_cost_usd?.toFixed(3) ?? '-',
])));

out.push('', 'Each run keeps its source (`lane-2/<run>/src/`), scores (`scores.json`), run metadata (`meta.json`) and thumbnails (`shots/`). Blind side-by-side: `lane-2/compare.html`.');
const verdict = path.join(LANE2, 'verdict.md');
if (fs.existsSync(verdict)) out.push('', fs.readFileSync(verdict, 'utf8').trim());

const md = out.join('\n') + '\n';
fs.writeFileSync(path.join(RESULTS, 'lane-2.md'), md);
fs.writeFileSync(path.join(RESULTS, 'lane-2.json'), JSON.stringify(cells.map((x) => ({
  run: x.id, scenario: x.meta.scenario, condition: x.meta.condition, rep: x.meta.rep,
  scores: Object.fromEntries(HEADLINE.map((h) => [h, x.s[h].score])), total: x.s.total,
  secondary: x.s.secondary && Object.fromEntries(SECONDARY.map((k) => [k, x.s.secondary[k].score])),
  turns: x.meta.run?.num_turns, wallMs: x.meta.wallMs, costUsd: x.meta.run?.total_cost_usd,
})), null, 2) + '\n');
console.log(md);
