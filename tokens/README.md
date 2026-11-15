# Orrery tokens

The DTCG 2025.10 source for every Orrery value. `npm run tokens:build` writes `generated/`; `npm run tokens:check` fails when `generated/` no longer matches the source. Never edit `generated/` by hand.

- **`base/core.tokens.json`**: scales every brand shares (spacing and layout widths, radius, border, shadow, type sizes).
- **`base/roles.tokens.json`**: role names and their usage notes (colors, type groups). No color values.
- **`brands/orrery/`**: the default brand. `brand.tokens.json` holds font families and the mode order; `modes/<mode>.tokens.json` holds the values for that mode.
- **Merge order**: base, then brand, then mode, by folder; a later layer wins. No DTCG Resolver.
- **Client brands** (`artifact/brands/*.tokens.json`) go through `artifact/head.py --print-tokens`, the only brand gate, and become one more layer on top of brand orrery.

## Outputs

- **`generated/tokens.json`**: the Artifact contract shape that `head.py`, `check.mjs` and the Tuner read. Deep-equals `artifact/snapshot/tokens.json` today.
- **`generated/css/<brand>.css`**: the same custom properties, in the same selectors, that `head.py` writes for that brand.
- **`generated/swift/OrreryTokens.swift`**: one file, one namespace per brand: light and dark colors, spacing, radius, border, type styles, springs.
- **`generated/css/orrery.system.css`**, **`generated/js/orrery.motion.mjs`** and the `TypeSteps`, `Grid`, `Breakpoints`, `HitTarget`, `Elevation` and `Springs` enums in the Swift file: the system scales and motion below. They are outside the Artifact contract, so `tokens.json` and the two Artifact CSS files never carry them.
- **`generated/checks.md`**: the checks report (see Brand schema and checks).

## Gates

`npm run tokens:build` stops on invalid DTCG (Terrazzo) and on a color whose `hex` and `components` disagree. It writes only after everything built, and prunes stale files only from a folder that is missing, empty, or a previous build (it holds a `.orrery-tokens-build` marker, which the build writes). Any other non-empty folder is refused with exit 2 and left untouched; `--out` must be outside the repo.

`npm run tokens:check` rebuilds into a temp folder and fails, with one line per gate, when:

- **drift**: the rebuild differs from the committed `generated/`.
- **snapshot**: the generated `tokens.json` does not deep-equal `artifact/snapshot/tokens.json`. The line names the first differing key.
- **head.py**: a generated CSS file's custom properties differ from `artifact/head.py`'s output, with no brand and for each client brand. The line names the first differing declaration. `bundle.css` is outside the comparison.

`node tokens/test.mjs` proves each gate passes on the real tree and fails on a seeded input. In CI the `tokens` job runs `tokens:build` and then fails if `git status --porcelain -- tokens/generated` is non-empty, which is the step that catches uncommitted drift (the build has just rewritten the folder, so `tokens:check`'s drift comparison cannot); `tokens:check` then runs the snapshot and head.py gates.

Not covered: the Swift output and the brand contract have only the drift gate. `color-scheme`, the body rule and the type classes in head.py's output are outside the head.py comparison.

## Brand schema and checks

`npm run tokens:build` also stops, one line per failure, on the four checks below, so `tokens:check` and the CI `tokens` job run them too. The data is in `checks/`; the code is `lib/checks.mjs`; the tests are `test-checks.mjs` (run by `test.mjs`).

- **Brand schema** (`checks/brand.schema.json`): one schema for every folder under `brands/`. A brand's `brand.tokens.json` carries, under `$extensions.com.orrery`, its `name`, its `modes`, and optionally `unlocked` and `optOut`.
- **Lock list**: `unlocked` lists the paths the brand may set: one path (`color.accent`), a group (`color.*`) or everything (`*`). Every other path is locked. A brand with no `unlocked` inherits `defaultUnlocked` from the schema: `color.accent`, `color.on-accent`, `font.sans`, the three slots a client-document brand has. Brand orrery unlocks everything. Fails with `lock: brand <name> sets locked path <path> in <file>`.
- **Client-document brands** stay in `artifact/brands/*.tokens.json`, in the format `artifact/head.py --brand` validates. head.py enforces the same three slots there and is still that format's only validator; the build does not re-check those files. They are layers on brand orrery, so they inherit its opt-outs and cannot declare their own.
- **Opt-outs**: entries in `optOut`, each with a non-empty `reason`. `{ "role": "color.x", "reason" }` drops a required role from that brand. `{ "check": "contrast", "role", "surface", "mode", "reason" }` lets one pair through (`mode` is optional; leave out `role` and `surface` to skip the whole check). An entry with no reason, or one that names an unknown check, pair or role, fails with `opt-out: brand <name>: opt-out <n> (...)`.
- **Required roles**: every leaf of `base/roles.tokens.json`; that file is the list. Checked on each mode after merging base, brand and mode. Fails with `required role: brand <name>, mode <mode>: <role> is missing`.
- **Contrast** (`checks/contrast.pairs.json`): the one list of pairs (`role`, `surface`, `kind`), each taken from the role's usage note. WCAG 2.2 AA: `text` 4.5:1, `ui` 3:1. Checked for every pair, brand and mode. Fails with `contrast: brand <name>, mode <mode>: <role> on <surface> is <measured>:1, needs <required>:1`.
- **Report**: `generated/checks.md` lists every opt-out in force and every pair's measured ratio per brand and mode.

Not in the pair list: `line` (the hairline only separates) and the `scale-1` to `scale-5` fills against the page (data graphics, not controls). Any folder under `brands/` other than `orrery` is checked, then written as `generated/css/<brand>.css` and `generated/css/<brand>.system.css` only: it is outside the Artifact contract and the Swift file.

- **`brands/solar/`**: the fixed dark look of seansmithdesign.com/solar (one mode, `dark`). Its own values come from that site's `src/solar/look/`; the roles the site has no value for carry brand orrery's dark value.

## Build tool: Terrazzo 2 (`@terrazzo/parser`)

Both tools were run end to end (commit `2fc0538` has both adapters). They produced byte-identical outputs, and neither one's built-in formats could produce any of the three outputs:

- **Contract JSON**: custom in both. No built-in format writes this shape.
- **CSS**: custom in both. Terrazzo's plugin-css can't nest `:root:not([data-theme="light"])` inside the media query without the Resolver `permutations` (ruled out), and both tools write colors and shadows in a different syntax than head.py.
- **Swift**: custom in both. `@terrazzo/plugin-swift` 0.3.4 writes only an asset catalog of colors. Style Dictionary's `ios-swift` formats write one mode and no type styles or springs.

| Custom code (non-blank, non-comment lines) | Terrazzo 2 | Style Dictionary 5 |
| --- | --- | --- |
| Tool adapter (`lib/resolve*.mjs`) | 9 | 6 |
| Shared emitters, loader, build (`lib/emit.mjs`, `lib/source.mjs`, `build.mjs`) | 257 | 257 |
| Total | 266 | 263 |

Style Dictionary needs 3 fewer lines, and that is the only gap in custom code. Terrazzo still wins, because it lints the source against DTCG and stops the build on bad tokens. Style Dictionary built all four seeded invalid tokens without a warning:

| Seeded invalid token | Terrazzo | Style Dictionary |
| --- | --- | --- |
| Dimension in `pt` | fails: `core/valid-dimension` | builds |
| Color with no `components` | fails: `core/valid-color` | builds |
| Typography with no `lineHeight` | fails: `core/valid-typography` | builds |
| `fontWeight: 1200` | fails: `core/valid-font-weight` | builds |

Matching that with Style Dictionary would take hand-written validation, which costs far more than 3 lines. Terrazzo also caught a real gap in the converted source: four type styles had no `letterSpacing`, which DTCG requires. They now carry `0`, and the contract output leaves zero tracking out, as today's file does.

## Known gaps in the source format

- **`em` is not a DTCG unit** (2025.10 allows `px` and `rem`). `layout-measure` (`43em`) and the letter-spacing values use `em`. Terrazzo accepts it; a strict validator would not.
- **No DTCG type for "no shadow".** Dark `shadow-lift` is an empty shadow list (`[]`), which the build writes as `none`.
- **No DTCG spring type.** Iris's open spring sits in `core.tokens.json` under `$extensions.com.orrery.testData` as test data for the Swift output, not as a token decision.

## System scales and motion

Type steps, grid, breakpoints, the hit target, elevation levels and the dialled Iris springs. `lib/system.mjs` writes them; where each value came from is in `docs/plans/orrery-scales-review.md`.

- **Outside the Artifact contract**: a top-level group carrying `$extensions.com.orrery.system: true` is skipped by the Artifact emitters (`lib/emit.mjs`) and written by `lib/system.mjs` instead. New type sizes and `type.line-height` sit inside the existing `type` group, which the contract only reads through its roles.
- **Type steps** (`base/scales.tokens.json`): every `type.size.<step>` that also has a `type.line-height.<step>`.
- **Hit target**: `target.hit-target-min`. The build stops, naming the token, when it is under 44px.
- **Elevation**: `base/scales.tokens.json` names the levels (`level-0` to `level-3`). A brand draws each level in `brands/<brand>/elevation.tokens.json` by setting `$extensions.com.orrery.draw` on it: `fill` (a `fill` token), `hairline` (`fill`, `line`, `line-width`) or `shadow` (`fill`, `shadow`). Every part must point at a role. The emitters build `fill` and `hairline`; a level that chooses `shadow` stops the build until that drawing is built. A level with no drawing is not emitted (brand orrery leaves `level-3` undrawn).
- **Springs** (`base/motion.tokens.json`): under `$extensions.com.orrery.motion.spring`, the same place and shape as the Phase 0 test spring, because DTCG has no spring type. Each is stored in the form it was dialled in. Only dialled springs go here; `tokens/motion.test.mjs` (run by `node tokens/test.mjs`) fails when one differs from its constant in `src/motion.ts`, or when a spring with no dialled constant is added.
- **Spring conversion, web**: a Motion transition object, `{ type: "spring", ...the stored numbers }`, which is what `mergeTransition` in `src/motion.ts` builds. A spring with no `mass` stays without one.
- **Spring conversion, Swift**: `OrrerySpring(mass, stiffness, damping)`, whose `animation` is `Animation.interpolatingSpring(mass:stiffness:damping:initialVelocity: 0)`. A spring with no `mass` gets 1, Motion's default.
- **No rule yet for duration and bounce springs**: all five promoted springs are stiffness, damping and mass. Motion and SwiftUI turn a duration and bounce into a spring differently, so that rule needs a measured comparison first; until then such a spring stops the build.

## Rules

`rules/rules.json` is the one list of the system's floors and rules. Read it there; it is not repeated in prose. Each rule has an `id`, a `layer` (`floor` or `rule`), a one-sentence `statement` that says only what its check proves, what it `applies` to (`tokens`, `source`, `page`), and either a `check` or a `reason`.

- **Add a rule**: append it to `rules.json`. Pick the check kind: `token-gate` (`ref` is `<file>#<export>` or `<file>#<export>.<method>` in `lib/`), `source-check` (`ref` is a key of `CHECKS` in `rules/check-source.mjs`), `artifact-checker` (`ref` is a rule id in `artifact/check/check.mjs`) or `test` (`ref` is a test file or audit script). Gates, source checks and audit scripts also need `check.test`, the title of a seeded-failure test.
- **No check**: set `"check": null` and `reason: { kind, text }`, where `kind` is `needs-render`, `judgement`, `held-decision` or `not-built`. `not-built` means checkable but not built yet.
- **Opt-in checks**: `"scope": "opt-in"` marks a check that only looks at what opts in, and the statement must say "opt-in". `control-min-size` reads only rules marked `/* orrery-control */`; add `/* orrery-hit-area: pseudo */` when a pseudo-element supplies the real hit area.
- **Seeded-failure tests** live in `rules/test-rules.mjs` or `test.mjs`. A test title starts with `[<rule-id>]` and names the checked function (or the source check id).
- **What the self-check proves** (it runs inside `npm run tokens:check`): ids are unique; every rule has a check or a valid reason; a gate ref names a function that exists and is called, in code (not a comment or a string), by `build.mjs`, `check.mjs` or a module they import; a source check or artifact rule exists; `check.test` names a test that exists and whose title carries the rule id and the checked function. **What it does not prove**: that the test really fails when the check is broken, or that a gate's logic matches its statement. Those are the reviewer's job.
- **DESIGN.md names, code owns values** (`design-md-names`, `lib/designmd.mjs`, run by `npm run tokens:check`): `DESIGN.md` holds judgement and names tokens. A name it writes in backticks must exist: a `--custom-property` in `generated/css/` or `src/styles.module.css` (or written as a string in `src/`), a lowercase `token.path` in the token source, a `SCREAMING_SNAKE` export of `src/`. It may state no hex, no `rgb`/`hsl`/`oklch` function and no px or ms number. Two exceptions only: the section headed "Values not yet in code" (values that exist nowhere in code yet; the list should shrink), and a line ending `<!-- allow-literal: reason -->`, which excuses that line's px and ms numbers for a sentence that needs the number to read as a principle (never a colour; a marker with no reason, or on a line with no px or ms number, fails). Not read as values: unitless numbers, `%`, `rem`, `s`, `deg`, spring numbers and `cubic-bezier()`; only px and ms are. Not read as names: a name written without backticks, a camelCase constant, a CSS class or data attribute, and whether the prose around a name is true.
- **Source rules**: `npm run rules:check -- [--only <rule-id>,...] <file-or-dir>...` prints `file:line rule-id message`, exits 1 on any finding and 2 on a bad argument, including an explicit file of a type no rule reads. JS, TS, JSX and TSX files are parsed with the repo's TypeScript (a devDependency; parse only, no type checking), so strings, templates, regex literals, JSX text and comments are told apart by the parser. Without `typescript` installed the checker exits 2. CSS and HTML are still text scanned.
- **Parse errors**: a JS or TS file TypeScript cannot parse is one `file:line parse-error` finding (exit 1), and no rule is applied to it. TypeScript's parser runs out of stack on very deep nesting (about 660 nested parentheses or 930 nested template strings); that file is a `parse-error` too.
- **Escape, CSS only**: `/* orrery-allow: <rule-id> <reason> */` on one line, directly before the declaration it excuses (`literal-color` and `literal-spacing` only). One marker covers every finding of its rule within that one declaration (a multi-value `box-shadow`), never the next one. To excuse a declaration that breaks both rules, stack one marker per rule. These are findings: an unknown rule id (the message lists the valid ones), a reason with no word of 3 or more letters, and a marker that excuses nothing (stale, the wrong rule, a compliant declaration, or no declaration after it). `rules:check` prints the count of allowed exceptions, and each with its marker line, finding line and reason, sorted by file then marker line.
- **JSX has no escape**: a marker in a `.tsx` or `.jsx` comment is itself a finding. Move the value into CSS, or pass it as a custom property: `style={{ "--orr-x": value }}` (keys starting `--` are never read).
- **Limits, so a green run is not read as "no literal values"**:
  - `literal-color` and `literal-spacing` read CSS files only. A custom property is read for spacing only when a hyphen-separated segment of its name is `pad`, `padding`, `gap`, `gutter`, `margin`, `space`, `spacing`, `inset`, `offset` or `indent` (space scale), or `radius` or `radii` (radius scale); `--icon-size: 16px` and `--marginalia: 8px` are not read, `--orr-gap-count: 8px` is. Positional offsets (`top`, `left`, `inset`) are read.
  - `inline-style-literal` reads object literals in the `style`, `animate`, `initial`, `exit`, `whileHover` and `whileTap` attributes of a real JSX tag (not `data-style`, not `let style = {}`), directly or in a ternary, `&&`, `||` or `??` branch, or as a call argument. Every element of a style array is read, and a whole-object cast (`{ ... } as CSSProperties`) is read. Values read: strings, numbers, template strings, arrays of those, ternaries and parentheses. A tag with an explicit generic (`<Foo<Bar> style=...>`) is read. Not read: `style={identifier}`, values computed by a call, computed keys, spreads, casts of a single value (`"#fff" as string`), nested objects (`transition` inside `animate`), `transform` and `translate` offsets, and color literals in TS outside those attributes. Each is pinned by a test.
  - Only values equal to a space or radius token are flagged; an off-scale `7px` passes.
  - `control-min-size` reads only rules marked `/* orrery-control */`; `/* orrery-hit-area: pseudo */` excuses a small box with a larger pseudo-element hit area. `em-dash` reads CSS, JS, TS and HTML outside comments; in JS and TS that is every string, template piece, JSX text and regex literal.
  - The registry's "gate is called" check reads text, not control flow. These still pass and are not caught: a call inside a function nothing calls, `other.name()` on an unrelated object, a call in a module that never imports the gate, and a call in a dead branch. In the other direction it fails closed, reporting a gate as not called, for a call inside a template-literal interpolation and for a call after a regex literal containing a quote.
- **Reduced motion**: each spring in `base/motion.tokens.json` carries `$reduced`: `opacity`, `none` or `instant`. The build stops, naming the spring, when one is missing. It declares intent for components and changes no emitted number.

## Iris bridge (opt-in)

`generated/css/orrery.iris.css` makes Iris follow the roles. Nothing loads it for you, and a page without it renders exactly as before: `src/` is untouched and the roles are unprefixed (`--page`, `--text`), so Iris reading them on its own would re-skin any page that already uses those names.

- **Opt in**: load `orrery.css`, then `orrery.iris.css`. In dark mode (`data-theme="dark"` or the system setting) the mapped variables follow the dark roles.
- **Maps** (`bridges/iris.json`, role path to `--orrery-iris-*`): `color.page` to `surface-elevated`, `color.text` to `text`, `color.accent` to `accent`, `border.line-width` to `surface-border-width`, `radius.radius-round` to `trigger-radius`, `spacing.space-24` to `sheet-padding`. Only variables whose documented default equals the role's brand-orrery light value exactly.
- **Does not map**: `surface` (`#fafafa`), `surface-border`, `sheet-radius`, both shadows, `z`, hover and press feel, highlight and press tint, sheet width. No role has their value, so they stay Iris's own literals, and dark with the bridge is only partly themed (`example/role-bridge.spec.ts`, `docs/plans/iris-roles-bridge/`).
- **Gate**: the build stops when a mapped variable is not documented in `README.md`, a role does not exist, or a role's light value differs from Iris's literal in `src/styles.module.css`.
- **Bridge alone** (without `orrery.css`) is safe: an undefined role leaves the variable invalid, so Iris's fallback applies. `npm run test:bridge` proves it.
