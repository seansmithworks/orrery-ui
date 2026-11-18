#!/usr/bin/env node
// npm run eval:lane2 -- [--reps 3] [--scenario <id>] [--condition <name>] [--concurrency 2]
// npm run eval:lane2 -- --workspaces      build one workspace per condition, list it, check isolation, delete it (no model spend)
// Runs `claude -p` on the subscription (no API key, no --bare) per cell, in a temp workspace OUTSIDE the repo, seeded for the
// cell's condition (eval/lane2/workspace.mjs). Every file the agent wrote or changed lands in eval/results/lane-2/<cell>/src/,
// beside meta.json. Resumable: a cell with a meta.json is skipped. Stops launching on a rate or usage limit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { CONDITIONS, OUT, REPO, allScenarios, listFiles } from './common.mjs';
import { promptFor, seedWorkspace } from './workspace.mjs';

const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? dflt : process.argv[i + 1]; };
const TIMEOUT_MS = 12 * 60 * 1000;
const concurrency = Math.min(2, Number(arg('concurrency', 2)));
const reps = Number(arg('reps', 3));
const tmpRoot = process.env.EVAL_TMP ?? os.tmpdir();

// Same flags as lane 1 (eval/run.mjs explains each).
const CLAUDE_FLAGS = [
  '--model', 'sonnet', '--output-format', 'json', '--no-session-persistence',
  '--tools', 'Read,Glob,Grep,Write,Edit', '--permission-mode', 'acceptEdits',
  '--safe-mode', '--restricted', '--strict-mcp-config', '--max-budget-usd', '3',
];
const LIMIT = /usage limit|rate limit|rate_limit|limit reached|quota|overloaded|429/i;

// A neutral directory name: the agent sees its cwd, and "orrery" must not leak into the bare and shadcn runs.
const makeWorkspace = (condition) => { const ws = fs.mkdtempSync(path.join(tmpRoot, 'ui-task-')); seedWorkspace(condition, ws); return ws; };
const hashes = (ws) => Object.fromEntries(listFiles(ws).map((f) => [f, crypto.createHash('sha1').update(fs.readFileSync(path.join(ws, f))).digest('hex')]));

if (process.argv.includes('--workspaces')) {
  for (const c of CONDITIONS) {
    const ws = makeWorkspace(c);
    const files = listFiles(ws);
    const grep = spawnSync('grep', ['-rlE', 'orr-|@orrery-ui|catalog\\.json', ws], { encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean);
    console.log(`\n== ${c}: ${files.length} files in ${ws}`);
    console.log(`   top level: ${fs.readdirSync(ws).sort().join(' ')}`);
    console.log(`   kit/ ${fs.existsSync(path.join(ws, 'kit')) ? 'PRESENT' : 'absent'}  DESIGN.md ${fs.existsSync(path.join(ws, 'DESIGN.md')) ? 'PRESENT' : 'absent'}  catalog files ${files.filter((f) => /catalog/.test(f)).length}`);
    console.log(`   files matching /orr-|@orrery-ui|catalog\\.json/: ${grep.length}${grep.length ? ` (e.g. ${path.relative(ws, grep[0])})` : ''}`);
    fs.rmSync(ws, { recursive: true, force: true });
  }
  process.exit(0);
}

function claude(ws, text) {
  return new Promise((resolve) => {
    const child = spawn('claude', ['-p', text, ...CLAUDE_FLAGS], { cwd: ws, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out, err }); });
  });
}

async function runCell(cell, state) {
  const dir = path.join(OUT, cell.id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  const ws = makeWorkspace(cell.condition);
  const before = hashes(ws);
  const t0 = Date.now();
  const { code, out, err } = await claude(ws, promptFor(cell.scenarioDef));
  const wallMs = Date.now() - t0;
  let run = null;
  try { run = JSON.parse(out); } catch { /* keep raw */ }
  const after = hashes(ws);
  const written = Object.keys(after).filter((f) => !(f in before));
  const changed = Object.keys(after).filter((f) => f in before && before[f] !== after[f]);
  for (const f of [...written, ...changed]) {
    fs.mkdirSync(path.dirname(path.join(dir, 'src', f)), { recursive: true });
    fs.copyFileSync(path.join(ws, f), path.join(dir, 'src', f));
  }
  const limited = LIMIT.test(`${err} ${run?.result ?? ''}`) && (run?.is_error || code !== 0);
  const meta = {
    scenario: cell.scenario, condition: cell.condition, rep: cell.rep, wallMs, exit: code, limited,
    timedOut: wallMs >= TIMEOUT_MS - 1000, workspaceFiles: Object.keys(before).length, written, changed,
    run: run && { is_error: run.is_error, subtype: run.subtype, num_turns: run.num_turns, duration_ms: run.duration_ms, total_cost_usd: run.total_cost_usd, usage: run.usage, result: String(run.result ?? '').slice(0, 800) },
    raw: run ? undefined : { out: out.slice(0, 2000), err: err.slice(0, 2000) },
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  fs.rmSync(ws, { recursive: true, force: true });
  if (limited) { state.limited = true; fs.rmSync(dir, { recursive: true, force: true }); }
  console.log(`${cell.id.padEnd(40)} exit ${code} turns ${run?.num_turns ?? '?'} ${(wallMs / 1000).toFixed(0)}s wrote ${written.length} changed ${changed.length}${written.includes('solution.tsx') ? '' : ' NO SOLUTION'}${limited ? ' RATE LIMITED (cell discarded)' : ''}`);
}

const gitState = () => spawnSync('git', ['-C', REPO, 'status', '--porcelain', '--', '.', ':!eval/results'], { encoding: 'utf8' }).stdout;

const scen = allScenarios().filter((s) => !arg('scenario') || s.id === arg('scenario'));
const conds = CONDITIONS.filter((c) => !arg('condition') || c === arg('condition'));
// Interleaved: rep-major, then scenario, then condition, so a stop mid-grid leaves the conditions balanced.
const cells = [];
for (let rep = 1; rep <= reps; rep++) for (const s of scen) for (const condition of conds) cells.push({ id: `${s.id}__${condition}__${rep}`, scenario: s.id, scenarioDef: s, condition, rep });
const queue = cells.filter((c) => !fs.existsSync(path.join(OUT, c.id, 'meta.json')));
const before = gitState();
const state = { limited: false };
console.log(`${queue.length} of ${cells.length} cell(s) to run, concurrency ${concurrency}, workspaces under ${tmpRoot}`);
await Promise.all(Array.from({ length: concurrency }, async () => { while (queue.length && !state.limited) await runCell(queue.shift(), state); }));
if (gitState() !== before) { console.error('ISOLATION BREACH: the repo changed during the run\n' + gitState()); process.exit(3); }
console.log(state.limited ? `STOPPED on a rate limit with ${queue.length} cell(s) not run` : 'grid finished; repo unchanged');
