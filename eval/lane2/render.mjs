// Lane-2 browser side: one Vite server per condition (same host page), one shared Chromium, and image helpers
// (pixel diff, downscale) that run in a blank page so no image library is needed.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from '@playwright/test';
import { LANE2, REPO, RESULTS, SHADCN } from './common.mjs';

// shadcn's "@/..." alias, resolved per file: from the nearest folder holding a components.json (the scoring cell, or the fixture).
function shadcnAlias() {
  return {
    name: 'lane2-shadcn-alias',
    async resolveId(id, importer) {
      if (!id.startsWith('@/') || !importer) return null;
      let dir = path.dirname(importer.split('?')[0]);
      while (dir !== path.dirname(dir) && !fs.existsSync(path.join(dir, 'components.json'))) dir = path.dirname(dir);
      if (!fs.existsSync(path.join(dir, 'components.json'))) return null;
      return this.resolve(path.join(dir, id.slice(2)), importer, { skipSelf: true });
    },
  };
}

async function tailwind() {
  const req = createRequire(path.join(SHADCN, 'package.json'));
  const mod = await import(pathToFileURL(req.resolve('@tailwindcss/vite')).href);
  return mod.default();
}

async function server(condition) {
  const plugins = [react()];
  const entries = [path.join(LANE2, 'render/main.tsx')];
  if (condition === 'orrery') entries.push(path.join(REPO, 'kit/index.ts'));
  if (condition === 'shadcn') { plugins.push(shadcnAlias(), await tailwind()); entries.push(path.join(SHADCN, 'components/ui/*.tsx')); }
  const s = await createServer({
    configFile: false,
    root: path.join(LANE2, 'render'),
    plugins,
    resolve: { dedupe: ['react', 'react-dom'] },
    server: { port: 0, host: '127.0.0.1', fs: { allow: [REPO] } },
    logLevel: 'error',
    cacheDir: path.join(RESULTS, `.vite-lane2-${condition}`),
    optimizeDeps: { entries },
  });
  await s.listen();
  return { url: `http://127.0.0.1:${s.httpServer.address().port}`, close: () => s.close() };
}

export async function startLane2() {
  const servers = {};
  for (const c of ['orrery', 'bare', 'shadcn']) servers[c] = await server(c);
  const browser = await chromium.launch();
  const toolCtx = await browser.newContext();
  const tool = await toolCtx.newPage();
  return {
    servers, browser,
    /** Share of pixels whose largest channel difference exceeds `tol` (0..255). Images of different size compare over the overlap and count the rest as changed. */
    async diff(a, b, tol) {
      return tool.evaluate(async ([a, b, tol]) => {
        const load = async (b64) => createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
        const px = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
        const da = px(ia), db = px(ib);
        let changed = 0;
        for (let i = 0; i < da.length; i += 4) {
          if (Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3])) > tol) changed++;
        }
        return { ratio: changed / (w * h), changed };
      }, [a.toString('base64'), b.toString('base64'), tol]);
    },
    /** PNG buffer scaled to `width` (never up). */
    async downscale(buf, width) {
      const b64 = await tool.evaluate(async ([b64, width]) => {
        const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const s = Math.min(1, width / img.width);
        const c = new OffscreenCanvas(Math.round(img.width * s), Math.round(img.height * s));
        const x = c.getContext('2d');
        x.imageSmoothingQuality = 'high';
        x.drawImage(img, 0, 0, c.width, c.height);
        const blob = await c.convertToBlob({ type: 'image/png' });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let s2 = ''; for (let i = 0; i < bytes.length; i += 0x8000) s2 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(s2);
      }, [buf.toString('base64'), width]);
      return Buffer.from(b64, 'base64');
    },
    async close() { await browser.close(); for (const s of Object.values(servers)) await s.close(); },
  };
}
