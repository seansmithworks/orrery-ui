// What each lane-2 condition's agent workspace holds. Same prompt for all three; only these files differ.
//   orrery  lane 1's `full`: the kit (with catalog and golden examples), the generated token CSS, the rules registry, DESIGN.md.
//   bare    React + TypeScript + plain CSS, and brand.css (the same brand variables as plain custom properties).
//   shadcn  shadcn/ui components (Radix + Tailwind v4) with brand.css wired as the Tailwind theme.
// No workspace holds node_modules: the agent cannot run code (file tools only), so packages are only needed at scoring
// time, where the scorer resolves them from the repo and from the pre-installed shadcn fixture.
import fs from 'node:fs';
import path from 'node:path';
import { CONDITIONS_DIR, REPO, buildBrandCss } from './common.mjs';

const notTest = (src) => !/\.(test|spec)\.(tsx?|mjs)$/.test(src) && !src.endsWith('/test.mjs');
const SHADCN_SKIP = new Set(['node_modules', 'package-lock.json']);

/** Seed `ws` (an empty dir) for one condition. */
export function seedWorkspace(condition, ws) {
  const fixture = path.join(CONDITIONS_DIR, condition);
  if (condition === 'orrery') {
    for (const rel of ['kit', 'tokens/generated/css', 'tokens/rules', 'DESIGN.md']) {
      fs.cpSync(path.join(REPO, rel), path.join(ws, rel), { recursive: true, filter: notTest });
    }
  } else {
    fs.writeFileSync(path.join(ws, 'brand.css'), buildBrandCss());
  }
  for (const e of fs.readdirSync(fixture)) {
    if (condition === 'shadcn' && SHADCN_SKIP.has(e)) continue;
    fs.cpSync(path.join(fixture, e), path.join(ws, e), { recursive: true });
  }
}

/** The one prompt suffix, identical for every condition. */
export const promptFor = (scenario) => `${scenario.prompt}

Read WORKSPACE.md first: it describes this workspace. Write the page to ./solution.tsx: one file whose default export is a React component (you may add files next to it, such as a CSS file that solution.tsx imports). You cannot run code; read what you need in this workspace, then write the files. Work only inside this directory.`;
