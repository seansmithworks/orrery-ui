#!/usr/bin/env node
// Acceptance test: kitchen-sink passes everything; each mutation fails exactly its expected rules; non-Orrery fails >= 3.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPages } from './check.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = (f) => path.join(here, 'fixtures', f);
// muted-on-layer2 also trips contrast in light (6e6e73 on efeff1 is 4.42:1), which is inherent to the pairing.
const ALL7 = ['token-colors', 'literal-values', 'one-shadow', 'fits-window', 'no-edge-bands', 'no-emoji-icons', 'contrast'];
const EXPECT = {
  'kitchen-sink.html': [],
  'mutations/literal-hex.html': ['literal-values'],
  'mutations/token-hue.html': ['token-colors', 'literal-values'],
  'mutations/second-shadow.html': ['one-shadow'],
  'mutations/muted-on-layer2.html': ['muted-on-layer2', 'contrast'],
  'mutations/low-contrast.html': ['contrast'],
  'mutations/overflow.html': ['fits-window'],
  'mutations/popup-offscreen.html': ['fits-window'],
  'mutations/edge-band.html': ['no-edge-bands'],
  'mutations/emoji.html': ['no-emoji-icons'],
  'mutations/exempt-declared.html': [],
  'mutations/exempt-undeclared.html': ['token-colors', 'literal-values'],
  'mutations/exempt-no-why.html': ['token-colors', 'literal-values'],
  'mutations/adv-x1-html-exempt.html': ALL7,
  'mutations/adv-x3-dot-why.html': ALL7,
  'mutations/adv-y1-oversized-fixed-menu.html': ['fits-window'],
  'mutations/adv-z4-contents-wrapper.html': ['token-colors', 'literal-values', 'contrast'],
  // adversarial cases from the step 1 review
  'mutations/adv-h1-smuggle-pad.html': ['token-colors', 'literal-values'],
  'mutations/adv-h2-smuggle-marker.html': ['token-colors', 'literal-values'],
  'mutations/adv-b1-dropshadow.html': ['one-shadow'],
  'mutations/adv-b2-textshadow.html': ['one-shadow'],
  'mutations/adv-b3-thickring.html': ['one-shadow'],
  'mutations/adv-c1-menu-nonaria.html': ['fits-window'],
  'mutations/adv-e2-border-plus-hairline.html': ['no-edge-bands'],
  'mutations/adv-e3-gradient.html': ['no-edge-bands'],
  'mutations/adv-e5-transparent-border.html': ['no-edge-bands'],
  'mutations/adv-f1-svgtext.html': ['no-emoji-icons'],
  'mutations/adv-f3-alt.html': ['no-emoji-icons'],
  'mutations/adv-g1-clip.html': ['fits-window'],
};
let bad = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) bad++; };

// core.js token list must match tokens.json
const tokens = JSON.parse(fs.readFileSync(path.join(here, '../snapshot/tokens.json'), 'utf8')).color.tokens.map((t) => t.name);
const coreTokens = fs.readFileSync(path.join(here, 'core.js'), 'utf8').match(/COLOR_TOKENS = \[([^\]]*)\]/)[1].match(/(['"])[^'"]+\1/g).map((s) => s.slice(1, -1));
ok(JSON.stringify(tokens) === JSON.stringify(coreTokens), 'core.js color token list matches snapshot/tokens.json');

const files = [...Object.keys(EXPECT), 'mutations/non-orrery.html'];
const res = await checkPages(files.map(fx));
res.forEach((p, i) => {
  const name = files[i];
  if (p.loadError) return ok(false, `${name} load error: ${p.loadError}`);
  const failed = p.rules.filter((r) => !r.pass).map((r) => r.rule);
  if (name === 'mutations/non-orrery.html') return ok(failed.length >= 3, `${name} fails ${failed.length} rules (need >= 3): ${failed.join(', ')} [${p.seconds}s]`);
  const want = [...EXPECT[name]].sort(), got = [...failed].sort();
  ok(JSON.stringify(want) === JSON.stringify(got), `${name} fails [${got.join(', ')}] expected [${want.join(', ')}] [${p.seconds}s]`);
});
console.log(bad ? `\n${bad} failure(s)` : '\nall passed');
process.exit(bad ? 1 : 0);
