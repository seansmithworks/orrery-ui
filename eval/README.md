# Eval loop

Proves which instruction-layer files (`DESIGN.md`, the kit catalog, the rules registry) change what an agent builds with the Orrery kit.

- `npm run eval:selftest`: no model spend. Every scenario reference must score 1.00 on all five scorers, and each file in `eval/fixtures/bad/` must fail the scorer it is named for.
- `npm run eval -- --run <id> --grid smoke|lane1`: runs `claude -p` (subscription auth, no API key, never `--bare`) per cell in a temp workspace outside the repo (`EVAL_TMP` or the OS temp dir). The workspace is seeded from the repo with the ablated files removed. The run checks the repo is unchanged afterwards.
- `npm run eval:score -- <id>`: scores each cell, writes `scores.json`. `npm run eval:report -- <id> [--summary lane-1]`: tables, and the committed summary.

Scorers (0..1, deterministic): `kit-only` (imports and raw controls, AST), `literals` (`tokens/rules/check-source.mjs`), `typecheck` (tsc against the real kit), `catalog` (components, parts, props, enum values, required parts, nesting against `kit/catalog.json`), `render` (headless Chromium + axe under orrery-light, orrery-dark and solar, after the scenario's steps).

Ablations: `full`, `-design` (no `DESIGN.md`), `-catalog` (no `kit/catalog.json`, `kit/catalog/`, per-component catalog and example files), `-rules` (no `tokens/rules/`), `floor` (none of the three). The agent gets Read, Glob, Grep, Write, Edit only: it cannot run the source checker, so the rules registry reaches it as text.

Scenarios: `eval/scenarios/<id>.json` (prompt plus render steps) and `<id>/reference.tsx`. Solutions import the kit from `./kit`; scoring symlinks `kit` into each cell.

Results go to `eval/results/<runId>/` (gitignored); `eval/results/lane-1.md|json` are the committed summaries.
