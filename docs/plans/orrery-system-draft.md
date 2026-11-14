# Orrery as a full system: DRAFT plan (not delivered, pending refuter)

Date: 2026-11-14. Target ref: `main` @ 5f99871 (0 ahead, 0 behind origin/main at draft time).

**Superseded 2026-11-14.** The revised plan is the Claude Doc at https://claude.ai/artifact/9VC6x921ssAbtRM8WDH4bc. This file is kept unedited below this note as evidence of the review gate. The critic found V3, V9 (Swift support), V11 and steps 0.1, 1.4, 1.7, T2, T6, T8 wrong or incomplete; see `orrery-system-refutation.md`. Do not build from this draft.

## Decisions already made by Sean (2026-11-14, this session)

- D1. Products share the skeleton (names, rules, checks) plus house scales (space, radius, type steps, motion, elevation). Brands own color, typefaces, which steps they use, and motion temperament (spring or curve). A brand may opt out of a scale with a stated reason (Tempo 2000's dot grid).
- D2. Audience: Sean first, public as showcase. No stability promise to outsiders.
- D3. Web: a full restyled kit up front (Sean chose this over "grow from what ships").
- D4. Proof order: this repo, then the seansmith.works site, then Ghostties. Brukas is stale. Sean is exploring resetting the Ghostties terminal in a new typeface.
- Standing: system name Orrery, component Iris, packages `@orrery-ui/iris` + umbrella `orrery-ui`, docs home at seansmithdesign.com `/lab/orrery`. Further part naming is parked until a parts audit (BACKLOG.md "Design calls").

## Verified current state (opened this session)

- V1. `artifact/snapshot/tokens.json` is a custom format, not DTCG: `{version, color:{themes,tokens[{name,value:{light,dark},usage}]}, type, spacing, radius, shadow, border}`. Flat, light and dark only.
- V2. `artifact/brands/example.tokens.json` is DTCG-shaped and can set only `color.accent`, `color.on-accent`, `font.sans`. `artifact/head.py` rejects any other top-level key and enforces 4.5:1 on-accent on accent and 3:1 accent on page, layer-1, layer-2 in both themes.
- V3. Brand gate logic exists twice: `artifact/head.py` (Python) and `artifact/check/check.mjs` + `core.js` (JS).
- V4. `.github/workflows/checks.yml` runs `npm ci`, `npm run typecheck`, `npm test` only, with a 10 minute timeout. The artifact checker and Playwright geometry are not in CI.
- V5. Iris reads 25 distinct `--orrery-iris-*` custom properties in `src/styles.module.css`. No token file backs them. Motion values are TS constants in `src/motion.ts`.
- V6. The skill agents actually load, `~/.claude/skills/artifact-house-style/` (a real directory, not a symlink), differs from the repo's `artifact/`: it has no `brands/`, and `SKILL.md`, `check/check.mjs`, `check/core.js` and fixtures differ.
- V7. Root `package.json` is `@orrery-ui/iris@0.1.1`; `packages/orrery-ui/package.json` is the umbrella `orrery-ui@0.1.1`. No npm workspaces.
- V8. `artifact/snapshot/bundle.css` already defines about 50 `.os-*` CSS primitives (button, field, check, choice, seg, chip, table, callout, disclosure, sheet, list, steps and more).
- V9. npm registry today: `@terrazzo/cli` 2.10.0 (MIT) with first-party `plugin-css`, `plugin-tailwind`, `plugin-js`, `plugin-swift`; `style-dictionary` 5.8.0 (Apache-2.0); `@base-ui/react` 1.9.0 (MIT); `motion` 14.14.0; `tailwindcss` 4.3.5. `@vercel/geistcn` does not resolve on npm.
- V10. Site (`~/Code/seansmithdesign.com`, read-only): `src/app/globals.css` is 3,032 lines with a Tailwind v4 `@theme`, four `[data-palette]` blocks and eleven `[data-theme]` variants. `src/components/ui/` holds three custom text components. `package.json` has no Base UI or Radix dependency.
- V11. Ghostties (`~/Code/ghostties`, read-only): 14 hex literals across `macos/Sources/Features/Ghostties/*.swift`, no theme or token type.

Second-hand, from explorer reports, not opened by the planner: site type scale and motion values, Ghostties and Brukas DESIGN.md contents, Tempo 2000 details, DTCG Resolver module status, shadcn's Base UI default.

## Approach

One token source in this repo, in DTCG 2025.10 JSON, split into core scales, roles and brands. A build step generates every platform file. Checks enforce the floors at build time and in CI. The web kit is plain CSS over those tokens plus React behavior from Base UI. Everything an agent reads is generated from the same source.

### Layers

1. Floors (checked, never prose): WCAG 2.2 AA contrast for every text and UI role pair in every brand and mode; 44pt / 48px targets; visible focus at 3:1; every motion role has a reduced-motion form; no literal color or spacing outside tokens in kit code.
2. Core scales (shared): space (4px base), radius, type steps (size plus line height), motion (durations, easings, springs stored as stiffness, damping, mass), elevation, grid (columns, gutters, margins, max widths), breakpoints, z.
3. Roles (shared names): surfaces (`page`, `layer-1`, `layer-2`), lines, text, accent, status; type roles (`title`, `heading`, `body`, `label`, `data`); motion roles (`enter`, `exit`, `settle`, `press`, `hover`, `stagger`).
4. Brands: a brand file fills the roles. Two tiers. `tint` is today's three slots (accent, on-accent, sans) and stays valid for client documents. `identity` can set every color role per mode, typefaces (sans, serif, mono, display), which steps it uses, elevation style and motion temperament. Opt-outs are declared in the file with a reason.
5. Outputs (generated): CSS custom properties per brand and mode, a Tailwind v4 `@theme` file, TS constants (Motion springs, three.js colors), flat JSON (Blender, scripts), Swift.
6. Kit (web): framework-free CSS (the successor to `.os-*`) so Artifact pages, quick tools and non-React output get the look, plus React components on `@base-ui/react` for behavior. Iris stays the signature piece and reads roles.
7. Agent layer (generated): a `catalog.json` of components, props, states and rules; a per-brand `DESIGN.md` whose values are emitted from tokens and whose rationale is hand-written; one skill; one checker CLI.

### Technical calls

- T1. Build tool: Terrazzo 2 (DTCG-native, first-party Swift and Tailwind plugins). Fallback: Style Dictionary 5. Settled by a spike that runs two brands by two modes through CSS and Swift, not by reading docs.
- T2. Brands and modes are expressed with the DTCG Resolver module if the chosen tool reads it; otherwise as one folder per brand merged in order by the build script.
- T3. Web base: `@base-ui/react` used directly. No shadcn code or styling is copied, so there is no shadcn look to remove. shadcn's component list is a checklist only. Geist is a reference only.
- T4. Kit styling is plain CSS (CSS Modules, `@layer`), not Tailwind classes. Tailwind projects get the generated `@theme` so utilities resolve to the same tokens.
- T5. Kit ships as an npm package, not a copy-in registry, so one fix reaches every project.
- T6. Packages: `packages/tokens` (`@orrery-ui/tokens`) and `packages/kit` (`@orrery-ui/kit`), added as npm workspaces. Root stays the Iris package. The umbrella re-exports all three.
- T7. Motion: springs are stored as physical parameters and converted per platform (Motion transition objects on web, `Animation.spring` on Swift). Curves are duration plus cubic-bezier. A brand's temperament maps each motion role to one or the other.
- T8. One implementation per gate. Brand validation moves into the token build; `head.py` reads already validated output.
- T9. No MCP server. A catalog file, a skill and a checker have one consumer each today; an MCP server would be a fourth surface for the same data.
- T10. Android, Blender loader and three.js consumers are not built. Their output files exist; a consumer is added when a product asks.

## Steps

### Phase 0. Pipeline spike (one thread, no visible change)
- 0.1 Convert `artifact/snapshot/tokens.json` into DTCG files under `packages/tokens/src/` (core, roles, brand `orrery`), keeping every value.
- 0.2 Port `artifact/brands/example.tokens.json` as a `tint` brand.
- 0.3 Build CSS, Swift and TS for {orrery, example} by {light, dark} with Terrazzo. If it cannot express brand by mode, repeat with Style Dictionary and record the choice.
- 0.4 Gate: the generated CSS variables equal `head.py`'s current output for the same inputs (diff of sorted declarations), and `artifact/check/test.mjs` still passes against a page built from the generated CSS.

### Phase 1. Foundation (2 to 3 threads)
- 1.1 Fill the missing scales: type steps, grid, elevation, motion, z, breakpoints. Values come from what products already use (4/8 unit, site's 12 column grid, Iris springs in `src/motion.ts`, Brukas's four springs).
- 1.2 Token checks at build: contrast per role pair per brand and mode, required roles present, opt-outs declared.
- 1.3 Iris reads roles: each `--orrery-iris-*` default falls back to a role variable. Public variable names and props do not change. `src/motion.ts` constants are generated or asserted equal to tokens by a unit test.
- 1.4 Reconcile the two neutrals (Artifact page `#ffffff`, Iris `#fafafa`) into brand `orrery`. This is a visual change and stops for Sean.
- 1.5 CI: add the token build, token checks and the artifact checker as a second job in `.github/workflows/checks.yml`.
- 1.6 Replace the drifting skill copy: `~/.claude/skills/artifact-house-style/` becomes an install produced from the repo by a script, with a check that fails when they differ.
- 1.7 `artifact/head.py` consumes built output; its duplicate validation is removed.

### Phase 2. Kit exemplars and the taste gate (one senior thread)
- 2.1 Build three components end to end: Button (with IconButton), Field with Input, Dialog. Each has CSS, a React wrapper on Base UI, tests (axe, keyboard, focus, reduced motion), and a catalog entry.
- 2.2 Build one specimen page that renders every state of those three under brand `orrery` and one `identity` brand, in light and dark.
- 2.3 Sean reviews the specimen. Nothing fans out until he approves the look. A visual gate (screenshot baseline) is committed by a separate agent before the fan-out.

### Phase 3. Kit fan-out (waves of at most 3 build threads, one branch and one reviewer each)
- Wave A (most used): Select, Checkbox, Radio, Switch, Textarea, Popover, Tooltip, Menu, Tabs, Toast, Card/Panel, Badge/Chip.
- Wave B: Combobox, Slider, NumberField, Toggle and ToggleGroup, AlertDialog, ContextMenu, Accordion, Collapsible, Table, Separator, Progress, Skeleton, ScrollArea, Avatar.
- Wave C: NavigationMenu, Breadcrumb, Pagination, PreviewCard, Meter, Kbd, Callout, plus layout and type primitives (Stack, Grid, Container, Heading, Text, Prose).
- Each component must pass the same tests as the exemplars under both brands and both modes.

### Phase 4. Agent layer (alongside phases 1 to 3)
- 4.1 `catalog.json` generated from kit source.
- 4.2 `DESIGN.md` per brand generated from tokens plus a hand-written rationale file.
- 4.3 One `orrery` skill that routes by surface (Artifact page, product UI, native) and replaces the hand-maintained copy.
- 4.4 `orrery check <path>`: the artifact checker generalized to any page built with the kit.
- 4.5 A stress script: generate N pages from one-line prompts, run the checker, report the failure rate.

### Phase 5. Site adoption (handoff to the site's own thread via BACKLOG, not edited from here)
- A `solar` identity brand; `globals.css` `@theme` values generated from tokens with a drift check; first kit component in use.

### Phase 6. Ghostties adoption (handoff to the Ghostties thread)
- A `ghostties` identity brand, generated Swift tokens with a drift check, the 14 hex literals replaced, and a mono typeface slot for the terminal type exploration.

Each phase ends with a build-journal entry, since the build itself is the showcase (D2).

## Out of scope

Android and Material. A Blender loader. A three.js consumer. An MCP server. A shadcn-style registry. Moving Iris out of the repo root. Brukas and Tempo 2000 adoption. Naming parts beyond plain package names. Figma variable sync.

## Risks

- R1. The kit is large (about 38 components) and no product needs most of it yet. Sean chose this; the taste gate in phase 2 is what keeps a wrong look from being copied 38 times.
- R2. Terrazzo is younger than Style Dictionary. The spike decides, and the source format is standard either way.
- R3. Phase 1.4 changes Iris's or Artifact's default look.
- R4. Sibling repos are owned by other threads; adoption depends on those threads picking up handoffs.

## Assumptions

- A1. The Artifact token values are the right seed for brand `orrery`.
- A2. Plain CSS plus Base UI can express the Iris-level craft bar for every kit component without Tailwind.
- A3. npm workspaces can be added with the root still being the publishable Iris package, without breaking the publish steps in the memory file `reference-npm-publish.md`.
- A4. The site and Ghostties threads will accept generated token files rather than hand-kept values.
- A5. Terrazzo's Swift plugin output is usable in an AppKit plus SwiftUI app, or can be replaced by a small custom template.
- A6. Sean wants the base brand to stay neutral (today's Artifact and Iris look), with product identities layered on top.
- A7. A full kit can keep one visual language across 38 components when built by parallel agents from three exemplars and a checker.

## Decisions Sean owns

1. Package names: plain `@orrery-ui/tokens` and `@orrery-ui/kit` (recommended) or named parts.
2. The kit list and wave order above.
3. Which neutral wins in brand `orrery` (recommended: Artifact's, since the checker already validates it).
4. Brand tier names: `tint` and `identity`.
5. Which identity brand is the second specimen brand in phase 2 (recommended: `solar`, the site's).
