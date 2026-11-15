#!/usr/bin/env node
// npm run catalog:build: writes kit/catalog.json, the one file a coding agent (or a runtime validator) reads to know what the kit allows.
// It is every kit/<folder>/<folder>.catalog.json merged, with each folder's golden example source inlined. Commit the result;
// npm run catalog:check fails when the committed file differs from a fresh build.
import fs from 'node:fs';
import path from 'node:path';
import { REPO, AGGREGATE, loadCatalog, schemaProblems, buildAggregate } from './check.mjs';

const catalog = loadCatalog();
const bad = schemaProblems(catalog);
if (bad.length) {
  console.error(`${bad.join('\n')}\ncatalog:build: fix the folder catalogs first; nothing written`);
  process.exit(1);
}
fs.writeFileSync(path.join(REPO, AGGREGATE), buildAggregate(catalog));
console.log(`catalog:build: wrote ${AGGREGATE}`);
