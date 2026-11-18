// The render scorer: mount a solution headless under each brand, run the scenario's steps, run axe (WCAG 2.x A/AA).
// A brand passes when the page renders, throws no error, every step finds its target, and axe reports no violation.
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { BRANDS, EVAL, REPO, prepareCell } from './common.mjs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export async function startRender() {
  const server = await createServer({
    configFile: false,
    root: path.join(EVAL, 'render'),
    plugins: [react()],
    server: { port: 0, host: '127.0.0.1', fs: { allow: [REPO] } },
    logLevel: 'error',
    cacheDir: path.join(EVAL, 'results/.vite'),
    optimizeDeps: { entries: [path.join(EVAL, 'render/index.html')] },
  });
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch();
  return { url, async close() { await browser.close(); await server.close(); }, browser };
}

/** dir: the cell's absolute path (holds solution.tsx). */
export async function render(rs, dir, scenario) {
  prepareCell(dir);
  const details = [];
  let passed = 0;
  for (const brand of BRANDS) {
    const context = await rs.browser.newContext({ viewport: { width: 900, height: 700 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.split('\n')[0]}`));
    try {
      await page.goto(`${rs.url}/index.html?file=${encodeURIComponent(path.join(dir, 'solution.tsx'))}&brand=${brand}`);
      await page.waitForFunction(() => document.getElementById('root')?.children.length > 0 || document.body.dataset.loadError, null, { timeout: 45000 });
      const loadError = await page.evaluate(() => document.body.dataset.loadError);
      if (loadError) errors.push(`load: ${loadError.split('\n')[0]}`);
      if (!errors.length) {
        for (const step of scenario.steps ?? []) {
          await page.getByRole(step.role, { name: step.name, exact: true }).first().click({ timeout: 4000 });
          await page.waitForTimeout(700);
        }
        const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        for (const v of result.violations) errors.push(`axe ${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0].target.join(' ')}`);
      }
    } catch (e) {
      errors.push(`${e.message.split('\n')[0]}`);
    }
    await context.close();
    if (errors.length === 0) passed++;
    else details.push(...errors.map((e) => `${brand}: ${e}`));
  }
  return { score: passed / BRANDS.length, pass: passed === BRANDS.length, details };
}
