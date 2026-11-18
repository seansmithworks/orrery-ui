#!/usr/bin/env node
// node eval/lane2/compare.mjs   Writes eval/results/lane-2/compare.html: per scenario, rep 1 of each condition side by
// side under shuffled labels (A, B, C; seeded per scenario so the file is stable), condition names hidden until "Reveal".
// Brand, width and state switchers. Self-contained: inline CSS and JS, images by relative path.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { BRANDS, CONDITIONS, HEADLINE, OUT, allScenarios, readJson } from './common.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const shuffle = (xs, seed) => {
  const a = [...xs];
  let h = crypto.createHash('sha1').update(seed).digest();
  for (let i = a.length - 1; i > 0; i--) { const j = h[i] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const sections = [];
for (const s of allScenarios()) {
  const picks = [];
  for (const c of CONDITIONS) {
    const id = [1, 2, 3].map((r) => `${s.id}__${c}__${r}`).find((x) => fs.existsSync(path.join(OUT, x, 'shots', `final-orrery-light-1280.png`)));
    if (!id) continue;
    picks.push({ c, id, s: readJson(path.join(OUT, id, 'scores.json')) });
  }
  const order = shuffle(picks, s.id);
  const hasStart = (s.steps ?? []).length > 0;
  const cols = order.map((p, i) => `
      <figure class="col">
        <figcaption><b>${'ABC'[i]}</b><span class="reveal">${esc(p.c)} · ${esc(p.id.split('__')[2] ? `rep ${p.id.split('__')[2]}` : '')} · total ${p.s.total.toFixed(2)}<br><small>${HEADLINE.map((h) => `${h} ${p.s[h].score.toFixed(2)}`).join(' · ')}</small></span></figcaption>
        <a class="shot" data-cell="${esc(p.id)}" href="./${esc(p.id)}/shots/final-orrery-light-1280.png"><img loading="lazy" data-cell="${esc(p.id)}" src="./${esc(p.id)}/shots/final-orrery-light-1280.png" alt="Option ${'ABC'[i]}"></a>
        <p class="src reveal"><a href="./${esc(p.id)}/src/solution.tsx">source</a></p>
      </figure>`).join('');
  sections.push(`
    <section data-start="${hasStart}">
      <h2>${esc(s.title)} <small>${esc(s.id)}${s.lane === 2 ? ' · new, no golden twin' : ''}</small></h2>
      <p class="prompt">${esc(s.prompt)}</p>
      ${hasStart ? `<p class="hint">Screenshots show the page after: ${s.steps.map((x) => `“${esc(x.name)}”`).join(', ')}. Switch “State” to see the page before.</p>` : ''}
      <div class="row">${cols}</div>
    </section>`);
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lane 2: blind comparison</title>
<style>
  :root { color-scheme: light; --ink: #1d1d1f; --muted: #6e6e73; --line: #e5e5ea; --fill: #f7f7f8; }
  body { margin: 0; font: 14px/1.5 system-ui, -apple-system, sans-serif; color: var(--ink); background: #fff; }
  header { position: sticky; top: 0; z-index: 2; background: #fff; border-bottom: 1px solid var(--line); padding: 12px 24px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
  header h1 { font-size: 16px; margin: 0 16px 0 0; }
  .group { display: flex; gap: 4px; align-items: center; }
  .group span { color: var(--muted); margin-right: 4px; }
  button { font: inherit; padding: 6px 12px; min-height: 32px; border: 1px solid var(--line); background: var(--fill); border-radius: 6px; cursor: pointer; color: var(--ink); }
  button[aria-pressed="true"] { background: var(--ink); color: #fff; border-color: var(--ink); }
  main { padding: 8px 24px 64px; }
  section { border-bottom: 1px solid var(--line); padding: 24px 0; }
  h2 { font-size: 18px; margin: 0 0 4px; }
  h2 small { color: var(--muted); font-weight: 400; font-size: 13px; }
  .prompt { color: var(--muted); max-width: 70em; margin: 0 0 8px; }
  .hint { font-size: 12px; color: var(--muted); margin: 0 0 12px; }
  .row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
  .col { margin: 0; }
  figcaption { display: flex; gap: 8px; align-items: baseline; margin-bottom: 6px; }
  figcaption b { font-size: 16px; }
  .shot { display: block; border: 1px solid var(--line); border-radius: 6px; overflow: auto; max-height: 75vh; background: var(--fill); }
  .shot img { display: block; width: 100%; height: auto; }
  body[data-width="375"] .shot img { width: auto; max-width: 100%; margin: 0 auto; }
  .reveal { display: none; color: var(--muted); }
  body.revealed .reveal { display: inline; }
  body.revealed p.reveal { display: block; }
  section[data-start="false"] .hint { display: none; }
</style>
</head>
<body data-brand="orrery-light" data-width="1280" data-state="final">
<header>
  <h1>Orrery vs no Orrery: blind comparison</h1>
  <div class="group" role="group" aria-label="Brand"><span>Brand</span>${BRANDS.map((b, i) => `<button data-set="brand" data-value="${b}" aria-pressed="${i === 0}">${b}</button>`).join('')}</div>
  <div class="group" role="group" aria-label="Width"><span>Width</span><button data-set="width" data-value="1280" aria-pressed="true">1280</button><button data-set="width" data-value="375" aria-pressed="false">375</button></div>
  <div class="group" role="group" aria-label="State"><span>State</span><button data-set="state" data-value="final" aria-pressed="true">after steps</button><button data-set="state" data-value="start" aria-pressed="false">before</button></div>
  <button id="reveal" aria-pressed="false">Reveal conditions</button>
</header>
<main>
  <p class="prompt">One run per condition per scenario (rep 1). Labels are shuffled per scenario. Same prompt for all three; only the workspace differed. Scores and the full tables are in <a href="../lane-2.md">lane-2.md</a>.</p>
  ${sections.join('\n')}
</main>
<script>
  const body = document.body;
  function update() {
    const { brand, width, state } = body.dataset;
    for (const img of document.querySelectorAll('img[data-cell]')) {
      const section = img.closest('section');
      const st = state === 'start' && section.dataset.start === 'true' && width === '1280' ? 'start' : 'final';
      const src = './' + img.dataset.cell + '/shots/' + st + '-' + brand + '-' + width + '.png';
      img.src = src;
      img.parentElement.href = src;
    }
  }
  for (const b of document.querySelectorAll('button[data-set]')) {
    b.addEventListener('click', () => {
      body.dataset[b.dataset.set] = b.dataset.value;
      for (const o of document.querySelectorAll('button[data-set="' + b.dataset.set + '"]')) o.setAttribute('aria-pressed', String(o === b));
      update();
    });
  }
  document.getElementById('reveal').addEventListener('click', (e) => {
    const on = body.classList.toggle('revealed');
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.textContent = on ? 'Hide conditions' : 'Reveal conditions';
  });
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'compare.html'), html);
console.log(`wrote ${path.join(OUT, 'compare.html')} (${sections.length} scenarios)`);
