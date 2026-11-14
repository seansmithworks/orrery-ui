// Terrazzo 2 adapter: parse + lint + resolve one merged mode document.
import { parse, defineConfig } from '@terrazzo/parser';
import { pathToFileURL } from 'node:url';
import { TOKENS } from './source.mjs';

const config = defineConfig({ tokens: ['base/core.tokens.json'] }, { cwd: pathToFileURL(TOKENS + '/') });

export async function resolve(brand, mode) {
  const src = { src: mode.doc, filename: pathToFileURL(`${TOKENS}/brands/${brand}/modes/${mode.id}.merged.json`) };
  const { tokens } = await parse([src], { config });
  return Object.fromEntries(Object.entries(tokens).map(([id, t]) => [id, { type: t.$type, value: t.$value, original: t.originalValue?.$value }]));
}
