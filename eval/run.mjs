#!/usr/bin/env node
// npm run eval -- --run <runId> --grid smoke|lane1 [--concurrency 2] [--scenario <id> --ablation <name>]
// Runs the agent for each cell with `claude -p` on the subscription (no API key, no --bare), in a temp workspace OUTSIDE the repo
// seeded from the repo with the ablated instruction files removed. The run can only touch its workspace; the repo is checked
// unchanged afterwards. Each finished cell lands in eval/results/<runId>/<cell>/ with solution.tsx and meta.json; score it with
// `npm run eval:score -- <runId>`. Stops launching new cells the moment the CLI reports a rate or usage limit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ABLATIONS, REPO, RESULTS, scenarios } from './lib/common.mjs';

const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? dflt : process.argv[i + 1]; };
const runId = arg('run');
const grid = arg('grid', 'smoke');
const concurrency = Math.min(2, Number(arg('concurrency', 2)));
const keep = process.argv.includes('--keep');
const TIMEOUT_MS = 12 * 60 * 1000;
if (!runId) { console.error('usage: npm run eval -- --run <runId> --grid smoke|lane1'); process.exit(2); }

// What each ablation removes from the workspace. Everything else (kit source, generated token CSS) is always present.
const REMOVE = {
  design: ['DESIGN.md'],
  catalog: ['kit/catalog.json', 'kit/catalog', 'kit/**/*.catalog.json', 'kit/**/*.example.tsx'],
  rules: ['tokens/rules'],
};
const DROPS = { full: [], '-design': ['design'], '-catalog': ['catalog'], '-rules': ['rules'], floor: ['design', 'catalog', 'rules'] };

function buildWorkspace(ablation, tmpRoot) {
  const ws = fs.mkdtempSync(path.join(tmpRoot, 'orrery-eval-'));
  const copy = (rel) => fs.cpSync(path.join(REPO, rel), path.join(ws, rel), { recursive: true, filter: (src) => !/\.(test|spec)\.(tsx?|mjs)$/.test(src) && !src.endsWith('/test.mjs') });
  for (const rel of ['kit', 'tokens/generated/css', 'tokens/rules', 'DESIGN.md']) copy(rel);
  for (const d of DROPS[ablation].flatMap((k) => REMOVE[k])) {
    if (!d.includes('*')) { fs.rmSync(path.join(ws, d), { recursive: true, force: true }); continue; }
    for (const dir of fs.readdirSync(path.join(ws, 'kit'), { withFileTypes: true }).filter((e) => e.isDirectory())) {
      for (const f of fs.readdirSync(path.join(ws, 'kit', dir.name))) {
        if (/\.catalog\.json$|\.example\.tsx$/.test(f)) fs.rmSync(path.join(ws, 'kit', dir.name, f));
      }
    }
  }
  return ws;
}

const listFiles = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? listFiles(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name))]);
const prompt = (s) => `${s.prompt}\n\nWrite the result to ./solution.tsx in the current directory: one file whose default export is a React component. Import UI from "./kit". You cannot run code; read what you need in this workspace, then write the file. Work only inside this directory.`;

// Isolation, verified against `claude --help` and by probe: --safe-mode drops CLAUDE.md, hooks, plugins, skills and MCP;
// --restricted removes Bash and confines the file tools to the workspace (a Read of /etc/hosts and a Write to ../ were
// both denied); --tools leaves only the five file tools. Auth stays the subscription login (no --bare, no API key).
// The CLI has no --max-turns; the real cap is TIMEOUT_MS, --max-budget-usd is advisory under subscription.
const CLAUDE_FLAGS = [
  '--model', 'sonnet',
  '--output-format', 'json',
  '--no-session-persistence',
  '--tools', 'Read,Glob,Grep,Write,Edit',
  '--permission-mode', 'acceptEdits',
  '--safe-mode',
  '--restricted',
  '--strict-mcp-config',
  '--max-budget-usd', '3',
];

function gitState() {
  return spawnSync('git', ['-C', REPO, 'status', '--porcelain', '--', '.', ':!eval/results'], { encoding: 'utf8' }).stdout;
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

const LIMIT = /usage limit|rate limit|rate_limit|limit reached|quota|overloaded|429/i;

async function runCell(cell, tmpRoot, state) {
  const dir = path.join(RESULTS, runId, cell.id);
  fs.mkdirSync(dir, { recursive: true });
  const ws = buildWorkspace(cell.ablation, tmpRoot);
  const files = listFiles(ws);
  const t0 = Date.now();
  const { code, out, err } = await claude(ws, prompt(cell.scenarioDef));
  let run = null;
  try { run = JSON.parse(out); } catch { /* keep raw */ }
  const solution = path.join(ws, 'solution.tsx');
  if (fs.existsSync(solution)) fs.copyFileSync(solution, path.join(dir, 'solution.tsx'));
  const limited = LIMIT.test(`${err} ${run?.result ?? ''}`) && (run?.is_error || code !== 0);
  const meta = {
    scenario: cell.scenario, ablation: cell.ablation, seed: cell.seed, wallMs: Date.now() - t0, exit: code, limited,
    workspaceFiles: files,
    run: run && { is_error: run.is_error, subtype: run.subtype, num_turns: run.num_turns, duration_ms: run.duration_ms, total_cost_usd: run.total_cost_usd, usage: run.usage, session_id: run.session_id, result: String(run.result ?? '').slice(0, 600) },
    raw: run ? undefined : { out: out.slice(0, 2000), err: err.slice(0, 2000) },
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  if (!keep) fs.rmSync(ws, { recursive: true, force: true });
  if (limited) state.limited = true;
  console.log(`${cell.id.padEnd(44)} exit ${code} turns ${run?.num_turns ?? '?'} ${fs.existsSync(path.join(dir, 'solution.tsx')) ? 'solution written' : 'NO SOLUTION'}${limited ? '  RATE LIMITED' : ''}`);
}

const byId = Object.fromEntries(scenarios().map((s) => [s.id, s]));
let cells;
if (grid === 'smoke') {
  const scenario = arg('scenario', 'profile-settings'), ablation = arg('ablation', 'full');
  cells = [{ scenario, ablation, seed: 1 }];
} else {
  // 3 scenarios x (full and floor x3 seeds, the three single ablations x1) = 27 runs. Order interleaves ablations so a stop mid-grid is balanced.
  const plan = [];
  for (const seed of [1, 2, 3]) for (const ablation of ABLATIONS) { if (seed === 1 || ablation === 'full' || ablation === 'floor') plan.push({ ablation, seed }); }
  cells = plan.flatMap((p) => Object.keys(byId).map((scenario) => ({ scenario, ...p })));
}
cells = cells.map((c) => ({ ...c, id: `${c.scenario}__${c.ablation}__${c.seed}`, scenarioDef: byId[c.scenario] }));
const doneAlready = (c) => fs.existsSync(path.join(RESULTS, runId, c.id, 'meta.json'));

const tmpRoot = process.env.EVAL_TMP ?? os.tmpdir();
const before = gitState();
const state = { limited: false };
const queue = cells.filter((c) => !doneAlready(c));
console.log(`${queue.length} cell(s) to run, concurrency ${concurrency}, workspaces under ${tmpRoot}`);
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (queue.length && !state.limited) await runCell(queue.shift(), tmpRoot, state);
}));
const after = gitState();
if (before !== after) { console.error('ISOLATION BREACH: the repo changed during the run\n' + after); process.exit(3); }
console.log(state.limited ? `STOPPED on a rate limit with ${queue.length} cell(s) not run` : 'grid finished; repo unchanged');
