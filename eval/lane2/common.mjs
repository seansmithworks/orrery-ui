// Lane 2: with Orrery vs without. Shared paths, conditions and the brand file every condition's host page loads.
import fs from 'node:fs';
import path from 'node:path';
import { EVAL, REPO, RESULTS } from '../lib/common.mjs';

export { EVAL, REPO, RESULTS };
export const LANE2 = path.join(EVAL, 'lane2');
export const CONDITIONS_DIR = path.join(EVAL, 'fixtures/conditions');
export const SHADCN = path.join(CONDITIONS_DIR, 'shadcn');
export const BRAND_CSS = path.join(CONDITIONS_DIR, 'shared/brand.css');
export const OUT = path.join(RESULTS, 'lane-2'); // committed: sources, scores, thumbnails
export const WORK = path.join(RESULTS, '.work-lane-2'); // gitignored: scoring cells with their symlinks
export const CONDITIONS = ['orrery', 'bare', 'shadcn'];
export const BRANDS = ['orrery-light', 'orrery-dark', 'solar'];
export const BRAND_ATTRS = { 'orrery-light': ['orrery', 'light'], 'orrery-dark': ['orrery', 'dark'], solar: ['solar', 'dark'] };
export const WIDTHS = [1280, 375];
export const HEADLINE = ['build', 'axe', 'keyboard', 'hit-target', 'brand'];
export const SECONDARY = ['kit-only', 'literals', 'catalog']; // lane-1 scorers, orrery only

export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** Every scenario, lane-1 and lane-2-only. */
export function allScenarios() {
  return fs.readdirSync(path.join(EVAL, 'scenarios')).filter((f) => f.endsWith('.json')).sort()
    .map((f) => readJson(path.join(EVAL, 'scenarios', f)));
}

/** The hit-target floor, read from the generated token CSS (DESIGN.md names it `--hit-target-min`). */
export function hitTargetMin() {
  const css = fs.readFileSync(path.join(REPO, 'tokens/generated/css/orrery.system.css'), 'utf8');
  return Number(/--hit-target-min:\s*(\d+)px/.exec(css)[1]);
}

// brand.css: the generated token CSS of both brands, scoped the way example/kit/scope.ts scopes it (:root becomes
// [data-brand="<brand>"], the prefers-color-scheme block dropped), with the generator's comments and the Iris spring
// numbers removed. Every condition's host page loads this same file; bare and shadcn workspaces get a copy.
const SOURCES = { orrery: ['orrery.css', 'orrery.system.css'], solar: ['solar.css', 'solar.system.css'] };
const HEADER = `/* Brand variables. The host page loads this file and sets two attributes on <html>:
   data-brand ("orrery" or "solar") and data-theme ("light" or "dark"). The page is shown in three brands:
   orrery light, orrery dark and solar (dark only). Colours, spacing, radii, type sizes and the minimum
   touch target (--hit-target-min) are all here. */
`;
export function buildBrandCss() {
  const scope = (css, brand) => css
    .replace(/@media \(prefers-color-scheme: [a-z]+\) \{[\s\S]*?\n\}\n/g, '')
    .replace(/\/\*[\s\S]*?\*\/\n?/g, '')
    .split('\n').filter((l) => !/--spring-/.test(l)).join('\n')
    .replaceAll(':root', `[data-brand="${brand}"]`);
  return HEADER + Object.entries(SOURCES).flatMap(([brand, files]) => files.map((f) => scope(fs.readFileSync(path.join(REPO, 'tokens/generated/css', f), 'utf8'), brand))).join('\n');
}

export const listFiles = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isSymbolicLink()) return [path.relative(base, p)];
  return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p)];
});
