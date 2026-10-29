#!/usr/bin/env node
// Orrery page checker CLI. node check.mjs <file.html|url> [...] [--json] [--theme light|dark|both] [--widths 375,1280]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const coreSrc = fs.readFileSync(path.join(here, 'core.js'), 'utf8');
const RULES = ['token-colors', 'literal-values', 'one-shadow', 'muted-on-layer2', 'contrast', 'fits-window', 'no-edge-bands', 'no-emoji-icons'];

// Resolve playwright in order: ORRERY_PLAYWRIGHT, then plain import. A copy whose browsers are not installed is skipped.
async function launchBrowser(pw) {
  const req = createRequire(import.meta.url);
  const tries = [];
  if (pw) tries.push(async () => pw);
  if (process.env.ORRERY_PLAYWRIGHT) tries.push(() => req(path.resolve(process.env.ORRERY_PLAYWRIGHT)));
  tries.push(async () => await import('playwright'));
  let last;
  for (const t of tries) {
    try { const m = await t(); const chromium = (m.chromium || m.default?.chromium); return await chromium.launch(); } catch (e) { last = e; }
  }
  throw new Error('no usable playwright (set ORRERY_PLAYWRIGHT): ' + last?.message.split('\n')[0]);
}

// Baseline = token VALUES (not the page's own :root) plus head.py's exact output for them.
function loadBaseline(tokensFile) {
  const skill = path.join(here, '..');
  const file = path.resolve(tokensFile || path.join(skill, 'snapshot/tokens.json'));
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const first = json.color.themes[0].id;
  const tokens = {};
  for (const t of json.color.tokens) tokens[t.name] = typeof t.value === 'object' ? t.value : { [first]: t.value };
  const args = ['-I', path.join(skill, 'head.py')];
  let tmp;
  if (tokensFile) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orrery-baseline-'));
    fs.copyFileSync(file, path.join(tmp, 'tokens.json'));
    fs.copyFileSync(path.join(skill, 'snapshot/bundle.css'), path.join(tmp, 'bundle.css'));
    args.push('--snapshot', tmp);
  }
  const head = execFileSync('python3', args, { encoding: 'utf8' });
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  return { tokens, headBlocks: [head.trim().replace(/^<style>/, '').replace(/<\/style>$/, '')] };
}

const toUrl = (t) => (/^https?:|^file:/.test(t) ? t : pathToFileURL(path.resolve(t.replace(/^~/, os.homedir()))).href);

async function runCombo(browser, url, theme, width, baseline) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 812 : 800 }, colorScheme: theme, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.evaluate(coreSrc);
    const rules = await page.evaluate((b) => globalThis.orreryCheck(document, b), baseline);
    const byId = Object.fromEntries(rules.map((r) => [r.rule, r]));
    const push = (rule, item, fail = true) => {
      const r = byId[rule];
      if (fail) { r.count++; r.pass = false; }
      if (r.items.length < 60) r.items.push({ ...item, detail: (fail ? '' : 'warning: ') + item.detail });
    };

    // focus rings: Tab through up to 40 stops
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const f = await page.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body || e.hasAttribute('data-oc-seen')) return { end: true };
        e.setAttribute('data-oc-seen', '1');
        return globalThis.orreryCheck.focus(document, e);
      });
      if (!f || f.end) break;
      if (!f.ring) push('contrast', { selector: f.selector, detail: 'no visible focus outline' }, false);
      else if (f.ok === false) push('contrast', { selector: f.selector, detail: f.detail });
    }
    await page.evaluate(() => document.activeElement?.blur?.());

    // popups: click each trigger (aria/summary and plain buttons); newly visible floating elements must sit inside the 8px gutter.
    // Any click that changed the page is undone by reloading, so each click starts from the same state.
    const tag = () => page.evaluate(() => {
      const t = globalThis.orreryCheck.popups.visibleTriggers(document);
      t.forEach((e, i) => e.setAttribute('data-oc-trigger', String(i)));
      return t.length;
    });
    const url0 = page.url();
    const n = await tag();
    for (let i = 0; i < n; i++) {
      try {
        await page.evaluate(() => { window.scrollTo(0, 0); globalThis.orreryCheck.popups.snapshot(document); });
        await page.locator(`[data-oc-trigger="${i}"]`).click({ timeout: 4000, noWaitAfter: true });
        await page.waitForTimeout(25);
        const { bad, changed } = await page.evaluate(() => ({
          bad: globalThis.orreryCheck.popups.offscreen(document, 8),
          changed: globalThis.orreryCheck.popups.shownSince(document),
        }));
        for (const b of bad) push('fits-window', b);
        if (changed || page.url() !== url0) {
          await page.goto(url0, { waitUntil: 'load', timeout: 20000 });
          await page.evaluate(coreSrc);
          await tag();
        }
      } catch (e) { /* trigger not clickable (covered or navigated): skip */ }
    }
    return rules;
  } finally {
    await ctx.close();
  }
}

export async function checkPages(targets, { themes = ['light', 'dark'], widths = [375, 1280], pw, tokensFile } = {}) {
  const baseline = loadBaseline(tokensFile);
  const browser = await launchBrowser(pw);
  const out = [];
  try {
    for (const target of targets) {
      const t0 = Date.now();
      const url = toUrl(target);
      const merged = Object.fromEntries(RULES.map((r) => [r, { rule: r, pass: true, count: 0, items: [], fails: [] }]));
      let loadError = null;
      // the theme x width combos are independent browser contexts: run them side by side
      const combos = themes.flatMap((theme) => widths.map((width) => ({ theme, width, combo: `${theme}@${width}` })));
      const done = await Promise.all(combos.map(async (c) => {
        try {
          let rules;
          try { rules = await runCombo(browser, url, c.theme, c.width, baseline); }
          catch (e) { rules = await runCombo(browser, url, c.theme, c.width, baseline); } // one retry: a busy machine can drop a context
          return { ...c, rules };
        }
        catch (e) { loadError = e.message.split('\n')[0]; return null; }
      }));
      for (const d of done) {
        if (!d) continue;
        const { combo, rules } = d;
        for (const r of rules) {
          const m = merged[r.rule];
          if (!r.pass) { m.pass = false; m.count = Math.max(m.count, r.count); m.fails.push(combo); }
          for (const it of r.items) {
            if (!r.pass && !it.detail.startsWith('warning:')) { if (!m.items.some((x) => x.selector === it.selector && x.detail === it.detail)) m.items.push({ ...it, at: combo }); }
            else if (it.detail.startsWith('warning:') && m.items.length < 80 && !m.items.some((x) => x.selector === it.selector && x.detail === it.detail)) m.items.push({ ...it, at: combo });
          }
        }
      }
      const rules = RULES.map((r) => merged[r]);
      out.push({ page: target, pass: !loadError && rules.every((r) => r.pass), loadError, seconds: +((Date.now() - t0) / 1000).toFixed(1), rules });
    }
  } finally {
    await browser.close();
  }
  return out;
}

function table(res) {
  const lines = [];
  for (const p of res) {
    lines.push(`${p.pass ? 'PASS' : 'FAIL'}  ${p.page}  (${p.seconds}s)`);
    if (p.loadError) lines.push(`  load error: ${p.loadError}`);
    for (const r of p.rules) {
      const offenders = r.items.filter((i) => !i.detail.startsWith('warning:')).slice(0, 3).map((i) => `${i.selector} ${i.detail}`).join(' | ');
      const warns = r.items.filter((i) => i.detail.startsWith('warning:')).length;
      lines.push(`  ${r.rule.padEnd(16)} ${r.pass ? 'pass' : 'FAIL'}  ${String(r.count).padStart(3)}  ${r.pass ? (warns ? `${warns} warning(s)` : '') : `[${r.fails.join(',')}] ${offenders}`}`);
    }
  }
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const targets = [];
  let json = false, tokensFile, theme = 'both', widths = [375, 1280];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') json = true;
    else if (a === '--theme') theme = args[++i];
    else if (a === '--tokens') tokensFile = args[++i];
    else if (a === '--widths') widths = args[++i].split(',').map(Number).filter(Boolean);
    else if (a.startsWith('--')) { console.error('unknown flag ' + a); process.exit(2); }
    else targets.push(a);
  }
  if (!targets.length || !['light', 'dark', 'both'].includes(theme)) {
    console.error('usage: node check.mjs <file.html|url> [...] [--json] [--theme light|dark|both] [--widths 375,1280] [--tokens tokens.json]');
    process.exit(2);
  }
  const res = await checkPages(targets, { themes: theme === 'both' ? ['light', 'dark'] : [theme], widths, tokensFile });
  console.log(json ? JSON.stringify(res, null, 2) : table(res));
  process.exit(res.every((p) => p.pass) ? 0 : 1);
}
