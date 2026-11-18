#!/usr/bin/env node
// Writes eval/fixtures/conditions/shared/brand.css from the generated token CSS (see buildBrandCss). Re-run after tokens:build.
import fs from 'node:fs';
import path from 'node:path';
import { BRAND_CSS, buildBrandCss } from './common.mjs';

fs.mkdirSync(path.dirname(BRAND_CSS), { recursive: true });
fs.writeFileSync(BRAND_CSS, buildBrandCss());
console.log(`wrote ${BRAND_CSS}`);
