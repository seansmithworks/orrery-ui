#!/usr/bin/env node
// npm run eval:report -- <runId> [--summary <name>]   Markdown tables from eval/results/<runId>/*/scores.json.
// --summary lane-1 also writes the committed copies eval/results/lane-1.md and lane-1.json.
import fs from 'node:fs';
import path from 'node:path';
import { ABLATIONS, RESULTS, SCORERS, readJson, scenarios } from './lib/common.mjs';

const args = process.argv.slice(2);
const runId = args[0];
if (!runId) { console.error('usage: npm run eval:report -- <runId> [--summary <name>]'); process.exit(2); }
const summaryName = args.includes('--summary') ? args[args.indexOf('--summary') + 1] : null;

const root = path.join(RESULTS, runId);
const cells = fs.readdirSync(root)
  .filter((c) => fs.existsSync(path.join(root, c, 'scores.json')) && fs.existsSync(path.join(root, c, 'meta.json')))
  .map((c) => ({ id: c, meta: readJson(path.join(root, c, 'meta.json')), scores: readJson(path.join(root, c, 'scores.json')) }));

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (v) => (v === null ? '-' : v.toFixed(2));
const sel = (f) => cells.filter(f);
const cost = cells.reduce((a, c) => a + (c.meta.run?.total_cost_usd ?? 0), 0);
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

const sc = scenarios().map((s) => s.id);
const out = [`# Eval run ${runId}`, '', `${cells.length} scored runs. Scores are 0..1; each cell is the mean over its runs (n in brackets). Total = mean of the five scorers.`, ''];

out.push('## Total, scenario by ablation', '');
out.push(table(['scenario', ...ABLATIONS], [...sc.map((s) => [s, ...ABLATIONS.map((a) => {
  const c = sel((x) => x.meta.scenario === s && x.meta.ablation === a);
  return c.length ? `${fmt(mean(c.map((x) => x.scores.total)))} (${c.length})` : '-';
})]), ['**all**', ...ABLATIONS.map((a) => {
  const c = sel((x) => x.meta.ablation === a);
  return c.length ? `**${fmt(mean(c.map((x) => x.scores.total)))}** (${c.length})` : '-';
})]]));

out.push('', '## By scorer, ablation by scorer (all scenarios)', '');
out.push(table(['ablation', ...SCORERS, 'total'], ABLATIONS.map((a) => {
  const c = sel((x) => x.meta.ablation === a);
  return [a, ...SCORERS.map((s) => fmt(mean(c.map((x) => x.scores[s].score)))), fmt(mean(c.map((x) => x.scores.total)))];
})));

out.push('', '## Every run', '');
out.push(table(['run', ...SCORERS, 'total', 'turns', 'cost USD'], cells.map((c) => [
  c.id, ...SCORERS.map((s) => fmt(c.scores[s].score)), fmt(c.scores.total), c.meta.run?.num_turns ?? '-', c.meta.run?.total_cost_usd?.toFixed(3) ?? '-',
])));
out.push('', `Subscription auth: cost shown is the CLI's own estimate (${cost.toFixed(2)} USD across the run), not a bill.`);

const failing = cells.flatMap((c) => SCORERS.filter((s) => !c.scores[s].pass).map((s) => `- ${c.id} / ${s}: ${c.scores[s].details[0] ?? ''}`));
if (failing.length) out.push('', '## First failure detail per failing scorer', '', ...failing);

const md = out.join('\n') + '\n';
fs.writeFileSync(path.join(root, 'report.md'), md);
console.log(md);
if (summaryName) {
  fs.writeFileSync(path.join(RESULTS, `${summaryName}.md`), md);
  fs.writeFileSync(path.join(RESULTS, `${summaryName}.json`), JSON.stringify(cells.map((c) => ({ run: c.id, ...c.meta, scores: Object.fromEntries(SCORERS.map((s) => [s, c.scores[s].score])), total: c.scores.total })), null, 2) + '\n');
}
