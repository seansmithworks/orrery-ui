#!/usr/bin/env node
// npm run eval:score -- <runId>   Score every cell of eval/results/<runId>/ (no model spend).
import { scoreRun } from './lib/score.mjs';

const runId = process.argv[2];
if (!runId) { console.error('usage: npm run eval:score -- <runId>'); process.exit(2); }
await scoreRun(runId);
