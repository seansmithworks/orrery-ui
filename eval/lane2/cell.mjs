// A lane-2 scoring cell: the agent's files (eval/results/lane-2/<cell>/src/) copied into a gitignored work dir inside the
// repo, plus what its condition needs to build and render. Also the two static headline scorers: build and brand literals.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BRAND_CSS, REPO, SHADCN, WORK, listFiles } from './common.mjs';

const link = (target, at) => { fs.mkdirSync(path.dirname(at), { recursive: true }); fs.symlinkSync(target, at); };

/** Build the work dir for the files in `srcDir`. Returns { dir, css } where css is the host stylesheets (absolute). */
export function workCell(id, srcDir, condition) {
  const dir = path.join(WORK, id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const src = fs.existsSync(srcDir) ? listFiles(srcDir) : [];
  const css = [BRAND_CSS];
  if (condition === 'orrery') {
    // The kit is linked, unless the agent edited a kit file: then the cell gets its own copy with the edits.
    if (src.some((f) => f.startsWith('kit/'))) fs.cpSync(path.join(REPO, 'kit'), path.join(dir, 'kit'), { recursive: true });
    else link(path.join(REPO, 'kit'), path.join(dir, 'kit'));
    link(path.join(REPO, 'tokens'), path.join(dir, 'tokens'));
    css.push(path.join(dir, 'kit/kit.css'));
  }
  if (condition === 'bare' || condition === 'shadcn') link(BRAND_CSS, path.join(dir, 'brand.css'));
  if (condition === 'shadcn') {
    // Components are the app's own source in shadcn, so they are copied (an agent may edit them), never linked.
    for (const rel of ['components', 'lib', 'components.json', 'app.css']) fs.cpSync(path.join(SHADCN, rel), path.join(dir, rel), { recursive: true });
    link(path.join(SHADCN, 'node_modules'), path.join(dir, 'node_modules'));
  }
  for (const f of src) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.rmSync(path.join(dir, f), { force: true });
    fs.copyFileSync(path.join(srcDir, f), path.join(dir, f));
  }
  if (condition === 'shadcn') {
    // app.css with Tailwind's source scan pinned to this cell (the copied components and the agent's files).
    const app = fs.readFileSync(path.join(dir, 'app.css'), 'utf8').replace('@import "tailwindcss";', '@import "tailwindcss" source(none);\n@source "./";');
    fs.writeFileSync(path.join(dir, 'host.css'), app);
    css.push(path.join(dir, 'host.css'));
  }
  fs.writeFileSync(path.join(dir, 'env.d.ts'), '/// <reference types="vite/client" />\n');
  return { dir, css, src };
}

/** typecheck: tsc over the agent's .ts/.tsx files with the repo's compiler options (strict, no unused), the same for every condition. */
export function build(cell, condition) {
  const files = cell.src.filter((f) => /\.tsx?$/.test(f) && !f.startsWith('kit/'));
  if (!files.includes('solution.tsx')) return { score: 0, pass: false, details: ['no solution.tsx was written'] };
  const compilerOptions = { rootDir: REPO, typeRoots: [path.join(REPO, 'node_modules/@types')] };
  if (condition === 'shadcn') Object.assign(compilerOptions, { baseUrl: '.', paths: { '@/*': ['./*'] } });
  fs.writeFileSync(path.join(cell.dir, 'tsconfig.lane2.json'), JSON.stringify({ extends: path.join(REPO, 'tsconfig.json'), include: [...files, 'env.d.ts'], compilerOptions }));
  const r = spawnSync(path.join(REPO, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.lane2.json', '--pretty', 'false'], { cwd: cell.dir, encoding: 'utf8' });
  const errors = `${r.stdout}${r.stderr}`.split('\n').filter((l) => /error TS\d+/.test(l));
  return { score: errors.length ? 0 : 1, pass: errors.length === 0, details: errors.slice(0, 8) };
}

// Hard-coded colours: anything that names a colour instead of a brand variable.
const NAMED = 'white|black|red|green|blue|gray|grey|silver|orange|yellow|purple|pink|navy|teal|maroon|olive|lime|aqua|fuchsia|crimson|gold|indigo|violet|tomato|coral|salmon|beige|ivory|khaki|lavender|whitesmoke|gainsboro|lightgray|lightgrey|darkgray|darkgrey|dimgray|dimgrey|slategray|slategrey';
const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const RULES = [
  ['hex colour', /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g],
  ['colour function with literal channels', /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[\d.]/g],
  ['Tailwind palette colour', new RegExp(`\\b[a-z]+-(?:${PALETTE})-\\d{2,3}\\b`, 'g')],
];
const NAMED_RE = new RegExp(`(?<![\\w-])(?:[a-z]+-)?(?:${NAMED})(?![\\w-])`, 'g');
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/.*$/gm, '$1');

function scanText(text, file, isCss) {
  const out = [];
  const lines = stripComments(text).split('\n');
  lines.forEach((l, i) => {
    for (const [name, re] of RULES) for (const m of l.matchAll(re)) out.push(`${file}:${i + 1} ${name}: ${m[0]}`);
    // Named colours: in CSS, in a declaration value; in TS/TSX, inside a string literal (a style value or a class).
    const zones = isCss ? [...l.matchAll(/:\s*([^;{}]+)/g)].map((m) => m[1]) : [...l.matchAll(/(["'`])((?:(?!\1).)*)\1/g)].map((m) => m[2]);
    for (const z of zones) for (const m of z.matchAll(NAMED_RE)) out.push(`${file}:${i + 1} named colour: ${m[0]}`);
  });
  return out;
}

/** Literal colour scan over the agent's own files (for an edited fixture file, only the lines the agent added). */
export function brandLiterals(cell, condition) {
  const findings = [];
  for (const f of cell.src.filter((x) => /\.(tsx?|css)$/.test(x))) {
    let text = fs.readFileSync(path.join(cell.dir, f), 'utf8');
    const original = condition === 'shadcn' ? path.join(SHADCN, f) : condition === 'orrery' ? path.join(REPO, f) : null;
    if (original && fs.existsSync(original)) {
      const had = new Set(fs.readFileSync(original, 'utf8').split('\n'));
      text = text.split('\n').map((l) => (had.has(l) ? '' : l)).join('\n');
    }
    findings.push(...scanText(text, f, f.endsWith('.css')));
  }
  return findings;
}
