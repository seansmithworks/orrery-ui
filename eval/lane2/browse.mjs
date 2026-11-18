// Lane-2 browser scorers, the same for every condition: axe, keyboard, hit target, brand (visual half), and the
// screenshots the comparison page shows. All in one headless Chromium (render.mjs), orrery-light unless stated.
import fs from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { BRANDS, hitTargetMin } from './common.mjs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const HEIGHT = { 1280: 800, 375: 812 };
const SHOT_CAP = { 1280: 2000, 375: 2400 }; // full-page shots stop at this height
const THUMB = { 1280: 640, 375: 375 };
export const BRAND_MIN = { lightDark: 0.5, darkSolar: 0.3 }; // share of viewport pixels that must change between brands
const FOCUS_TOL = 16; // channel difference that counts as a changed pixel for the focus indicator
const BRAND_TOL = 2; // exact render, so only real colour change counts

async function open(rs, cell, condition, brand, width) {
  const context = await rs.browser.newContext({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.split('\n')[0]}`));
  const q = new URLSearchParams({ brand, file: path.join(cell.dir, 'solution.tsx') });
  for (const c of cell.css) q.append('css', c);
  await page.goto(`${rs.servers[condition].url}/index.html?${q}`);
  let loadError = null;
  try {
    await page.waitForFunction(() => document.getElementById('root')?.children.length > 0 || document.body.dataset.loadError, null, { timeout: 45000 });
    loadError = await page.evaluate(() => document.body.dataset.loadError ?? null);
  } catch (e) { loadError = `nothing rendered: ${e.message.split('\n')[0]}`; }
  await page.waitForTimeout(300);
  return { page, context, errors, loadError };
}

/** Find a step's target by role and exact name; if the role is missing, a button, then exact text. Returns [locator, note]. */
async function find(page, step) {
  const tries = [[page.getByRole(step.role, { name: step.name, exact: true }), null]];
  if (step.role !== 'button') tries.push([page.getByRole('button', { name: step.name, exact: true }), `"${step.name}" has no role=${step.role}; found as a button`]);
  tries.push([page.getByText(step.name, { exact: true }), `"${step.name}" has no role=${step.role}; found by its text`]);
  for (const [loc, note] of tries) if (await loc.first().isVisible().catch(() => false)) return [loc.first(), note];
  return [null, `step "${step.name}" (${step.role}) not found`];
}

async function runSteps(page, steps, notes) {
  for (const step of steps ?? []) {
    const [loc, note] = await find(page, step);
    if (note) notes.add(note);
    if (!loc) return false;
    await loc.click({ timeout: 4000 }).catch((e) => notes.add(`step "${step.name}": ${e.message.split('\n')[0]}`));
    await page.waitForTimeout(700);
  }
  return true;
}

async function axe(page) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `axe ${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0].target.join(' ')}`);
}

async function shot(page, width, full) {
  if (!full) return page.screenshot({ animations: 'disabled' });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  return page.screenshot({ animations: 'disabled', fullPage: true, clip: { x: 0, y: 0, width, height: Math.min(Math.max(h, HEIGHT[width]), SHOT_CAP[width]) } });
}

// Interactive elements, tagged with data-l2 so Node can refer to them. Composite items with a roving tabindex (tabs,
// radios, menu items, options) are hit targets but not Tab stops; a native radio group counts as one Tab stop.
const TAG_CANDIDATES = (scopeSel) => {
  const COMPOSITE = new Set(['tab', 'radio', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'treeitem', 'gridcell']);
  const SEL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex],[contenteditable=true],[role=button],[role=link],[role=tab],[role=switch],[role=checkbox],[role=radio],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=option],[role=combobox],[role=slider],[role=spinbutton]';
  const roots = scopeSel ? [...document.querySelectorAll(scopeSel)] : [document];
  const els = [...new Set(roots.flatMap((r) => [...r.querySelectorAll(SEL)]))];
  const out = [];
  let n = document.querySelectorAll('[data-l2]').length;
  for (const el of els) {
    if (el.closest('[inert],[aria-hidden="true"]') || el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const role = el.getAttribute('role') ?? '';
    const ti = el.getAttribute('tabindex');
    const native = el.matches('a[href],button,input,select,textarea,summary');
    const interactive = native || (role && role !== 'dialog' && role !== 'alertdialog' && role !== 'tabpanel' && role !== 'menu' && role !== 'listbox' && role !== 'group');
    if (!interactive) continue;
    const roving = ti === '-1' && COMPOSITE.has(role);
    // Every other control should be a Tab stop, including a role="button" div that forgot its tabindex.
    const tabStop = !roving && ti !== '-1';
    if (!el.dataset.l2) el.dataset.l2 = String(n++);
    // Tiny controls (a visually hidden input) show focus on their label or parent: measure that box instead.
    const box = r.width < 4 || r.height < 4 ? (el.closest('label') ?? el.parentElement).getBoundingClientRect() : r;
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().slice(0, 40);
    out.push({
      id: el.dataset.l2, name, tabStop, tiny: r.width < 4 || r.height < 4, opacity: Number(st.opacity),
      group: el.matches('input[type=radio][name]') ? `radio:${el.name}` : el.dataset.l2,
      rect: { x: box.left + scrollX, y: box.top + scrollY, width: box.width, height: box.height },
    });
  }
  return out;
};

const clipOf = (rect, width) => {
  const x = Math.max(0, Math.floor(rect.x - 8)), y = Math.max(0, Math.floor(rect.y - 8));
  return { x, y, width: Math.max(1, Math.min(width - x, Math.ceil(rect.width + 16))), height: Math.ceil(rect.height + 16) };
};

async function keyboard(rs, cell, condition, scenario) {
  const details = [];
  const parts = [];
  // 1. Reach and visible focus, from a fresh page.
  {
    const { page, context, loadError } = await open(rs, cell, condition, 'orrery-light', 1280);
    if (loadError) { await context.close(); return { score: 0, pass: false, details: [`load: ${loadError}`] }; }
    const cands = (await page.evaluate(TAG_CANDIDATES, null)).filter((c) => c.tabStop);
    const base = {};
    for (const c of cands) base[c.id] = await page.screenshot({ fullPage: true, clip: clipOf(c.rect, 1280), animations: 'disabled' });
    await page.evaluate(() => document.activeElement?.blur());
    const reached = new Set(), visible = new Set();
    let first = null;
    for (let i = 0; i < cands.length + 15; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(120);
      const id = await page.evaluate(() => document.activeElement?.dataset?.l2 ?? null);
      if (id && id === first) break;
      if (!id || reached.has(id) || !base[id]) continue;
      if (!first) first = id;
      reached.add(id);
      const c = cands.find((x) => x.id === id);
      const now = await page.screenshot({ fullPage: true, clip: clipOf(c.rect, 1280), animations: 'disabled' });
      const d = await rs.diff(base[id], now, FOCUS_TOL);
      const area = clipOf(c.rect, 1280).width * clipOf(c.rect, 1280).height;
      if (d.changed >= Math.max(20, 0.01 * area)) visible.add(id);
    }
    const groups = [...new Set(cands.map((c) => c.group))];
    const reachedGroups = groups.filter((g) => cands.some((c) => c.group === g && reached.has(c.id)));
    for (const g of groups.filter((x) => !reachedGroups.includes(x))) details.push(`not reachable by Tab: ${cands.find((c) => c.group === g).name}`);
    for (const id of reached) if (!visible.has(id)) details.push(`no visible focus indicator: ${cands.find((c) => c.id === id).name}`);
    parts.push(groups.length ? reachedGroups.length / groups.length : 1);
    parts.push(reached.size ? visible.size / reached.size : (groups.length ? 0 : 1));
    await context.close();
  }
  // 2. Overlay: opens from the keyboard, Escape closes it, focus returns to the trigger.
  if (scenario.overlay) {
    const o = scenario.overlay;
    const { page, context } = await open(rs, cell, condition, 'orrery-light', 1280);
    const notes = new Set();
    await runSteps(page, o.pre, notes);
    const [trigger, note] = await find(page, o.trigger);
    if (note) notes.add(note);
    const shown = () => page.getByText(o.text, { exact: false }).first().isVisible().catch(() => false);
    let opened = false, closed = false, returned = false;
    if (trigger) {
      await trigger.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      opened = await shown();
      if (opened) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        closed = !(await shown());
        returned = closed && (await trigger.evaluate((el) => el === document.activeElement || el.contains(document.activeElement)).catch(() => false));
      }
    }
    if (!opened) details.push(`overlay: Enter on "${o.trigger.name}" did not open it`);
    else if (!closed) details.push('overlay: Escape did not close it');
    else if (!returned) details.push(`overlay: focus did not return to "${o.trigger.name}"`);
    details.push(...[...notes].map((n) => `overlay: ${n}`));
    parts.push(opened ? 1 : 0, closed ? 1 : 0, returned ? 1 : 0);
    await context.close();
  }
  const score = parts.reduce((a, b) => a + b, 0) / parts.length;
  return { score, pass: score === 1, details };
}

// Effective hit area: the 44x44 square centred on the control must hit the control everywhere (a pseudo-element hit
// area counts, since it hits its element; so does the label that wraps or names the control).
const HIT_TEST = ([ids, min]) => ids.map((id) => {
  const el = document.querySelector(`[data-l2="${id}"]`);
  if (!el) return { id, ok: true, skipped: true };
  el.scrollIntoView({ block: 'center', inline: 'center' });
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2, h = min / 2 - 1;
  const pts = [[0, 0], [-h, -h], [0, -h], [h, -h], [-h, 0], [h, 0], [-h, h], [0, h], [h, h]];
  const owns = (t) => t && (el === t || el.contains(t) || (t.closest('label') && (t.closest('label').control === el || t.closest('label').contains(el))));
  const miss = pts.filter(([dx, dy]) => !owns(document.elementFromPoint(cx + dx, cy + dy))).length;
  return { id, ok: miss === 0, w: Math.round(r.width), h: Math.round(r.height) };
});

async function hitTarget(rs, cell, condition, scenario) {
  const min = hitTargetMin();
  const details = [];
  let total = 0, ok = 0;
  for (const width of [1280, 375]) {
    const { page, context, loadError } = await open(rs, cell, condition, 'orrery-light', width);
    if (loadError) { await context.close(); return { score: 0, pass: false, details: [`load: ${loadError}`] }; }
    const states = [['page', null]];
    if (scenario.steps?.length) states.push(['overlay', '[role=dialog],[role=alertdialog],[role=menu],[role=listbox],dialog[open]']);
    for (const [state, scope] of states) {
      if (state === 'overlay') await runSteps(page, scenario.steps, new Set());
      const cands = (await page.evaluate(TAG_CANDIDATES, scope)).filter((c) => !c.tiny && c.opacity > 0);
      if (state === 'page') await page.evaluate(() => document.activeElement?.blur());
      const res = await page.evaluate(HIT_TEST, [cands.map((c) => c.id), min]);
      for (const r of res.filter((x) => !x.skipped)) {
        total++;
        if (r.ok) ok++;
        else details.push(`${width}px ${state}: "${cands.find((c) => c.id === r.id).name}" is ${r.w}x${r.h}, its hit area is under ${min}x${min}`);
      }
    }
    await context.close();
  }
  return { score: total ? ok / total : 1, pass: ok === total, details: [...new Set(details)].slice(0, 12), total };
}

/** Everything that needs a browser for one cell. Saves screenshots to shotsDir (thumbnails) and fullDir (full size). */
export async function browse(rs, cell, condition, scenario, shotsDir, fullDir) {
  fs.mkdirSync(shotsDir, { recursive: true });
  fs.mkdirSync(fullDir, { recursive: true });
  const save = async (name, buf, width) => {
    fs.writeFileSync(path.join(fullDir, `${name}.png`), buf);
    fs.writeFileSync(path.join(shotsDir, `${name}.png`), await rs.downscale(buf, THUMB[width]));
  };
  const axeOut = { passed: 0, details: [] };
  const start = {};
  const notes = new Set();
  let loadFailed = null;
  for (const brand of BRANDS) {
    for (const width of [1280, 375]) {
      const { page, context, errors, loadError } = await open(rs, cell, condition, brand, width);
      if (loadError) { loadFailed = loadError; await context.close(); continue; }
      if (width === 1280) {
        const found = [...(await axe(page))];
        start[brand] = await shot(page, width, false);
        if (scenario.steps?.length) await save(`start-${brand}-${width}`, await shot(page, width, true), width);
        await runSteps(page, scenario.steps, notes);
        found.push(...(await axe(page)).map((v) => `after steps: ${v}`));
        found.push(...errors);
        if (found.length === 0) axeOut.passed++;
        else axeOut.details.push(...[...new Set(found)].map((v) => `${brand}: ${v}`));
      } else {
        await runSteps(page, scenario.steps, notes);
      }
      await save(`final-${brand}-${width}`, await shot(page, width, true), width);
      await context.close();
    }
  }
  if (loadFailed) {
    const z = { score: 0, pass: false, details: [`load: ${loadFailed}`] };
    return { axe: z, keyboard: z, 'hit-target': z, brandVisual: { ...z, ratios: null }, notes: [...notes] };
  }
  const lightDark = (await rs.diff(start['orrery-light'], start['orrery-dark'], BRAND_TOL)).ratio;
  const darkSolar = (await rs.diff(start['orrery-dark'], start.solar, BRAND_TOL)).ratio;
  const vd = [];
  if (lightDark < BRAND_MIN.lightDark) vd.push(`only ${(lightDark * 100).toFixed(0)}% of the page changes between orrery light and dark (needs ${BRAND_MIN.lightDark * 100}%)`);
  if (darkSolar < BRAND_MIN.darkSolar) vd.push(`only ${(darkSolar * 100).toFixed(0)}% of the page changes between orrery dark and solar (needs ${BRAND_MIN.darkSolar * 100}%)`);
  return {
    axe: { score: axeOut.passed / BRANDS.length, pass: axeOut.passed === BRANDS.length, details: axeOut.details.slice(0, 12) },
    keyboard: await keyboard(rs, cell, condition, scenario),
    'hit-target': await hitTarget(rs, cell, condition, scenario),
    brandVisual: { score: ((lightDark >= BRAND_MIN.lightDark) + (darkSolar >= BRAND_MIN.darkSolar)) / 2, pass: vd.length === 0, details: vd, ratios: { lightDark, darkSolar } },
    notes: [...notes],
  };
}
