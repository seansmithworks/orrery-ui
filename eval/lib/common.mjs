// Shared paths and cell helpers for the eval loop. A "cell" is one solution.tsx scored in place under
// eval/results/<runId>/<cellId>/. The cell gets a `kit` symlink to the repo kit so "./kit" resolves for
// the type checker, the source checker and Vite alike.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const EVAL = path.join(REPO, 'eval');
export const RESULTS = path.join(EVAL, 'results');
export const BRANDS = ['orrery-light', 'orrery-dark', 'solar'];
export const SCORERS = ['kit-only', 'literals', 'typecheck', 'catalog', 'render'];
export const ABLATIONS = ['full', '-design', '-catalog', '-rules', 'floor'];

export function scenarios() {
  return fs
    .readdirSync(path.join(EVAL, 'scenarios'))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(EVAL, 'scenarios', f), 'utf8')))
    .filter((s) => s.lane !== 2); // lane-2-only scenarios (no golden twin, no lane-1 reference); lane 2 reads them all
}

export const scenarioById = (id) => scenarios().find((s) => s.id === id);

/** Make sure `dir` has its `kit` symlink and return the path to its solution.tsx. */
export function prepareCell(dir) {
  const link = path.join(dir, 'kit');
  if (!fs.existsSync(link)) fs.symlinkSync(path.join(REPO, 'kit'), link, 'dir');
  return path.join(dir, 'solution.tsx');
}

export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
