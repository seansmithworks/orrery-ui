# Eval loop

Proves which instruction-layer files (`DESIGN.md`, the kit catalog, the rules registry) change what an agent builds with the Orrery kit.

- `npm run eval:selftest`: no model spend. Every scenario reference must score 1.00 on all five scorers, and each file in `eval/fixtures/bad/` must fail the scorer it is named for.
- `npm run eval -- --run <id> --grid smoke|lane1`: runs `claude -p` (subscription auth, no API key, never `--bare`) per cell in a temp workspace outside the repo (`EVAL_TMP` or the OS temp dir). The workspace is seeded from the repo with the ablated files removed. The run checks the repo is unchanged afterwards.
- `npm run eval:score -- <id>`: scores each cell, writes `scores.json`. `npm run eval:report -- <id> [--summary lane-1]`: tables, and the committed summary.

Scorers (0..1, deterministic): `kit-only` (imports and raw controls, AST), `literals` (`tokens/rules/check-source.mjs`), `typecheck` (tsc against the real kit), `catalog` (components, parts, props, enum values, required parts, nesting against `kit/catalog.json`), `render` (headless Chromium + axe under orrery-light, orrery-dark and solar, after the scenario's steps).

Ablations: `full`, `-design` (no `DESIGN.md`), `-catalog` (no `kit/catalog.json`, `kit/catalog/`, per-component catalog and example files), `-rules` (no `tokens/rules/`), `floor` (none of the three). The agent gets Read, Glob, Grep, Write, Edit only: it cannot run the source checker, so the rules registry reaches it as text.

Scenarios: `eval/scenarios/<id>.json` (prompt plus render steps) and `<id>/reference.tsx`. Solutions import the kit from `./kit`; scoring symlinks `kit` into each cell.

Results go to `eval/results/<runId>/` (gitignored); `eval/results/lane-1.md|json` are the committed summaries.

## Lane 2: with Orrery vs without

Lane 1 always had the kit installed, so it never measured "no Orrery". Lane 2 does, in `eval/lane2/`.

- Conditions (`eval/lane2/workspace.mjs`, fixtures in `eval/fixtures/conditions/`), one prompt for all: `orrery` (lane 1 `full`), `bare` (React + plain CSS + `brand.css`), `shadcn` (shadcn/ui on Radix + Tailwind v4, `brand.css` as the theme). `brand.css` is the generated token CSS of both brands, scoped by `data-brand`/`data-theme` (`node eval/lane2/build-brand.mjs` after `tokens:build`). The shadcn fixture's packages are installed once (`npm ci --legacy-peer-deps` in `eval/fixtures/conditions/shadcn`, no React of its own) and only used at scoring; no workspace holds `node_modules`.
- Host page (`eval/lane2/render/`): the same for every condition. Sets the brand attributes, loads `brand.css` and the condition's stylesheet, and mounts the solution as the whole page with no wrapper or background.
- `npm run eval:lane2 -- [--reps 3]` runs the grid (resumable); `--workspaces` builds, lists and deletes one workspace per condition (isolation evidence). `npm run eval:lane2:score` scores (thumbnails to `<run>/shots/`, full size to `L2_FULL`), `npm run eval:lane2:report` writes `eval/results/lane-2.md|json`, `node eval/lane2/compare.mjs` writes the blind `eval/results/lane-2/compare.html`.
- Headline scorers, fair to all conditions: `build`, `axe` (serious/critical, three brands, before and after the steps), `keyboard`, `hit-target`, `brand`. Lane 1's `kit-only`, `literals`, `catalog` are secondary columns for `orrery` only. `eval:selftest` also proves one positive control per condition at 1.00 and one bad fixture per new scorer (`eval/fixtures/lane2/`).
- Every run's source, scores and thumbnails are committed under `eval/results/lane-2/<run>/`.
