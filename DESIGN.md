---
version: alpha
name: "Orrery Iris — Design System"
---

# Design System: Orrery Iris

Preset `refined-minimal`, with motion governed by §4 below instead of the preset's Motion section. This file holds judgement and names the tokens; it holds no values. Values live in code: the fallback on each `--orrery-iris-*` read in `src/styles.module.css` (listed for consumers in `README.md`'s theming table, which `npm run audit:vars` checks by name), the springs and timings in `src/motion.ts` (mirrored in `tokens/base/motion.tokens.json`), and the shared Orrery roles in the token source under `tokens/`. `npm run tokens:check` fails when this file names a variable, token path or export that does not exist, or states a literal colour, px or ms value outside the exceptions listed in `tokens/lib/designmd.mjs`.

## Foundations

Applies to kit, Iris and Artifact pages. Theory is assumed; these are Orrery's choices. Lines marked (prose) are unproven until the eval loop shows they change output. Each line ends with its rule in `tokens/rules/rules.json`, which names the check that enforces it or says why none can.

**Space and grid**
- Space comes only from `--space-*`. 8 is the rhythm between components; `--space-4`, `--space-12` and `--space-20` are fine steps inside one. Rule: `space-scale-only`.
- Pages use `--grid-columns` columns, a gutter from `--grid-gutter-tight`, `-standard` or `-roomy`, margins from `--grid-margin-mobile` to `--grid-margin-wide`, capped at `--grid-max-width`. (prose) Rule: `grid-system`.
- Every interactive element's hit area is at least `--hit-target-min` each way; small controls reach it with a pseudo-element, never by growing. Rule: `hit-target-rendered`.

**Type**
- Pick a role, never a size: title, lead, heading, subhead, body, body-sm, caption, stat (sans); label, data (mono). Rule: `type-role-size`.
- A `--type-size-*` always travels with its own `--type-line-height-*`; never set a line height by hand. Rule: `type-line-height-pair`.
- Prose caps at `--layout-measure`. Rule: `prose-measure`.
- Headings balance. Paragraphs never end on a lone word. Labels, buttons and tabs are one line; they never wrap or truncate. Rule: `text-wrap-rendered`.
- Two families, `--font-sans` and `--font-mono`: the system faces in brand Orrery. No serif and no web font unless a brand sets one. Mono is for data and labels only. Rule: `font-family-token`.
- Numbers that line up (tables, stats, times) use tabular numerals. Rule: `tabular-numerals`.

**Colour**
- Components read roles, never hues: page, layer-1, layer-2, line, text, text-muted, accent. Brands change values, never roles. Rule: `color-roles-only`.
- Brand Orrery is neutral: a white light page, not off-white or cream; layers step by value, not warmth; the accent is the text colour, not orange or blue. Hue enters only through a brand file. Rule: `brand-orrery-neutral`.
- The accent marks two things: the focus ring and the primary button fill. Selected and on states use text with a page-colour mark. Rule: `accent-primary-and-ring-only`.
- No decorative gradients, glows or tinted shadows. Rule: `no-decorative-effects`.

**Accessibility floor**
- Text meets AA in every brand and mode. Rules: `contrast-aa-tokens`, `contrast-aa-page`.
- Focus is a `--ring-width` outline in `--accent`, on keyboard focus, never removed. Rules: `focus-ring-drawn`, `focus-ring-contrast`.
- Under reduced motion every spring falls back to its declared reduced form; nothing moves by transform. Rules: `reduced-motion-form`, `reduced-motion-implemented`.

**Motion**
- §4 governs. Agents never add a duration or easing; kit timing waits for the Tuner. (prose) Rule: `motion-no-new-timing`.

## 1. Visual Theme

A bare disc that becomes a sheet. Everything else on screen is quiet so the morph is the only event. Neutral by default, so the motion, not the palette, is what a viewer reads; Warm paper (the seansmithdesign.com origin) is an alternate palette a consumer opts into.

- Near-monochrome. Iris's one accent, `--orrery-iris-accent`, marks only its focus rings: Iris has no primary button. Kit components spend the accent as Foundations → Colour says, on the focus ring and the primary button fill.
- Whitespace and a hairline border carry structure; the sheet's one shadow is the only substantial shadow on the page.
- No gradients or decorative color inside the package. The demo's iridescent glow is a recording aid behind a toggle, never a default.

## 2. Color

| Role | Variable |
| --- | --- |
| Surface (trigger) | `--orrery-iris-surface` |
| Surface, elevated (sheet) | `--orrery-iris-surface-elevated` |
| Border | `--orrery-iris-surface-border` |
| Text | `--orrery-iris-text` |
| Accent (focus ring only) | `--orrery-iris-accent` |
| Page background | consumer's |

Package defaults are the `var()` fallbacks in `src/styles.module.css`. The example pages set the same variables to the same neutral values in `example/example.css`, and the Warm palette is the `body[data-surface="warm"]` cell in that file; neither adds a role. Each example page sets its own page background in its own HTML.

Dark recipe: the package's default dark accent for `--orrery-iris-accent` is the one in the README dark recipe (Sean, 2026-10-10), the same as the canvas page's dark accent in `example/canvas/canvas.css`. The sun orange is a seansmithdesign.com docs-site (Night theme) value only, never a package default; it is listed under "Values not yet in code".

Consumers override with `--orrery-iris-*` custom properties. Never add a hex to `src/styles.module.css` that is not a `var()` fallback.

## 3. Shape and Depth

- **Trigger:** `shape` on Root, default circle (`--orrery-iris-trigger-radius` at its default). Squircle is a true superellipse via `corner-shape` (Chromium; elsewhere a plain radius of `SQUIRCLE_FALLBACK_RADIUS_FRACTION` of trigger size) and gives the sheet squircle corners too; rounded square is `ROUNDED_SQUARE_RADIUS_FRACTION` of trigger size (both radius fractions are v0.2 strawmen awaiting dial); square is 0. Surface, silhouette shadow, Shared clip and focus ring all follow the shape, and the shadow's corner uses the surface's own radius curve. It rests at its shape after every close path (geometry tests (o) and (o-shape)).
- **Sheet:** `--orrery-iris-sheet-radius`. During the morph the radius is a pure function of `collapseProgress`, never its own spring.
- **Two shadow looks, one painter.** `<Iris.Shadow>` paints both the thin disc shadow and the sheet's heavier resting shadow on its own silhouette, crossfaded by opacity as `collapseProgress` moves (2026-09-11). Nothing else paints a shadow.
- **Trigger shadow:** soft and low-contrast, dialled by Sean 2026-10-07: `--orrery-iris-shadow` at its default on light. The dark example palettes set the same variable to a faint white glow instead (the dark cell of `example/example.css`), because a dark shadow does not read on a dark ground. The `--orrery-iris-surface-border` ring (a light hairline on light, a faint white one on dark), at `--orrery-iris-surface-border-width`, carries the edge; the shadow only lifts it off the page.
- **Sheet shadow:** `--orrery-iris-sheet-shadow` at its default on light; on the dark example palettes the same variable is set to a white glow (2026-10-07, the dark cell of `example/example.css`).
- **Ring width is one token.** `--orrery-iris-surface-border-width` sets the trigger ring, and Shared's inset, its size fallback and its rounded-square radius all derive from it, so the Shared clip stays concentric with the ring at any width. Never hard-code the ring width anywhere else. The sheet's border does not follow it; its width is fixed in `src/styles.module.css`.
- **Trigger hover and press:** at rest only, the trigger rises by `--orrery-iris-trigger-hover-lift` on mouse hover and scales to `--orrery-iris-trigger-press-scale` while pressed, on a short strong ease-out (the `transition` on the trigger surface in `src/styles.module.css`), with `<Iris.Shadow>` moving identically so the two never disagree (lift and press dialled 2026-10-07). Never while the sheet is mounted, never under reduced motion, and any open drops it instantly before the morph measures its start.
- **Trigger highlight:** a soft radial spot inside the trigger surface follows the mouse on hover; on press it tightens (its scale is set in `src/styles.module.css`) and the surface takes a slight tint, `--orrery-iris-trigger-press-tint`, which the dark example palettes set to a white tint. Its colour is `--orrery-iris-trigger-highlight-color`, by default a fixed share of `--orrery-iris-text`, at `--orrery-iris-trigger-highlight-strength` and `--orrery-iris-trigger-highlight-size`; the dark example palettes set a white colour and a stronger strength, all dialled 2026-10-07. Touch, keyboard and reduced motion get it centred and static, fade only. It lives inside the surface, so it never changes a measured box, never paints on the sheet, and is gone before any open. `--orrery-iris-trigger-highlight-strength: 0` turns it off.
- **Tap target:** every trigger has an invisible hit area of at least the tap-target minimum on each axis (set by the literal in the `.triggerButton::before` rule of `src/styles.module.css`, which is not `target.hit-target-min`; rectangle s/m, small discs). The visual and every measured box keep their size.
- **Close button:** hit area at the `target.hit-target-min` floor (set as `min-width` and `min-height` on `.closeButton` in `src/styles.module.css`), transparent, circular focus ring.
- **Media sheet:** `<Iris.Sheet aspectRatio>` contain-fits the media ratio; `<Iris.Media>` covers the surface, centred, clipped by the surface shape (Strawman (v0.2): centred crop, no focal point).
- **Rectangle trigger:** `shape="rectangle"` with `buttonSize` s/m/l sets height, inline padding and gap (the `data-orrery-iris-button-size` rules in `src/styles.module.css`); the s/m/l sizes are v0.2 strawmen awaiting dial. Width sizes to the label by default, or a fixed `buttonWidth`. Corners are a pill, `min(--orrery-iris-trigger-radius, height / 2)` (Strawman (v0.2), awaiting dial). Shared and Media are not supported inside it in v0.2.

## 4. Motion Principles

The morph is the product, so it gets the budget a modal normally does not. Everything else obeys Emil Kowalski's standards (`~/.claude/skills/review-animations/STANDARDS.md`).

1. **One surface, one clock.** Surface box, silhouette shadow, corner radius and close mask all derive from `collapseProgress`. Nothing has its own spring. A frame where the shadow and the surface disagree is a bug, not a tuning question. The shadow is painted by `<Iris.Shadow>` and nowhere else: a second copy on any surface makes the shadow change intensity the frame that surface mounts or unmounts. *(Fixed 2026-09-11: `.triggerSurface` carried a duplicate, so the resting disc painted two shadows and the open's first frame halved them. Also fixed 2026-09-11: the sheet's own resting shadow, painted separately via `data-orrery-iris-settled`, was a second painter/second clock — `<Iris.Shadow>` now paints that look too, crossfaded on `collapseProgress`.)* `<Iris.Media>` has no clock either: it reads the surface's rendered scale on each of Motion's own style writes and counter-scales to a uniform cover, so the video can never squash (P4, 2026-09-13).
2. **Nothing appears from nothing.** The sheet must never paint at a size the disc did not grow into. A stall that skips the first 30% of the morph is a defect even if every frame after it is perfect. *(Known, bounded: the first open after page load stalls ~50ms on Sean's GPU — one dropped frame of morph; every later open runs with no frame over 20ms. Measured 2026-09-11. Open only if a cold first open ever needs to be the recorded one.)* <!-- allow-literal: a dated measurement, not a design value -->
3. **Transform and opacity only while the clock runs.** No filter, blur, box-shadow, width or height animates during a morph. The silhouette shadow resizes per frame today; moving it to a transform is the durable fix.
4. **Springs, dialled, never typed.** Open `DEFAULT_OPEN_SPRING` · close `DEFAULT_CLOSE_SPRING` · shared open `DEFAULT_SHARED_SPRING` · shared close `DEFAULT_SHARED_CLOSE_SPRING` · lead delay `SURFACE_CLOSE_LEAD_DELAY_MS` · snap `SNAP_SPRING`, all in `src/motion.ts` and mirrored in `tokens/base/motion.tokens.json`. A change to any of these goes through the tuner (`/tune`) with a measured before/after, never a hand edit.
5. **Reveal after settle.** Content and the close control reveal once the surface is within `CLOSE_REVEAL_PROGRESS` of rest. Items stagger at `ITEM_STAGGER_INTERVAL_SEC` (Sean, 2026-09-13), deliberately past the old 30–80ms band <!-- allow-literal: the old band this decision departs from, not a source value --> so title, body and actions land as separate beats. The close control's scale-from-0 spin is a deliberate exception to "start at 0.9+", chosen 2026-09-10 for the glyph's symmetry; if it ever reads as popping, that is the first thing to revisit. A trigger's plain children (its label) fade in from `collapseProgress` at `TRIGGER_LABEL_REVEAL_START` to 1 on close (Strawman (v0.2), awaiting dial), derived from progress like every other reveal here — never from spring velocity.
6. **Exit faster than enter.** Content fades out in `CONTENT_FADE_OUT_MS`; the close control reverses in `CLOSE_EXIT_SEC`; the close spring is stiffer than the open.
7. **Reduced motion is a crossfade, not nothing.** No `layoutId`, no transforms, opacity only, 200ms. The close control stays visible and reachable. <!-- allow-literal: the crossfade length, a literal in src/Sheet.tsx -->
8. **Judge with the instrument, not memory.** Every motion change ships with before/after frame measurement; acceptance is the pixel. Smoothness is a number (distinct rendered frames per open+close, warm browser). Recording aids (the glow toggle) are off when judging.

## 5. Agent Prompt Guide

- Read this file and `src/motion.ts` before any change to the morph.
- Run `npm run test:geometry` (expect 36 vitest / 76 Playwright) and never loosen a threshold to fit a feel change.
- Reviewer is never the builder; green tests written by the builder are not evidence.
- Two `test:geometry` runs race over the shared dev server. Never run it concurrently with anything.

## Values not yet in code

Values stated here exist only in this file. Move each into code and name it above; this list should shrink.

- Sun orange `#ffb37b`: the seansmithdesign.com docs-site (Night theme) accent. It lives in that site's repo, not this one.

## Reference Ceiling

- **Apple Dynamic Island** — `design/reference/apple-dynamic-island.png` — one shape becoming another, shadow and content on one clock.
- **Family wallet drawer** — `design/reference/family-wallet.png` — continuity and settle feel for sheets.
- **Vaul drawer (Emil Kowalski)** — `design/reference/vaul-drawer-open.png` — web-native open/close smoothness and gesture dismiss.
- **seansmithdesign.com ContactSheet** — `design/reference/seansmithdesign-contactsheet-closed.png` — the source this package was extracted from; the feel it must not lose.

Screenshots are first-pass captures of each site's landing state; replace with a mid-morph frame of each when one is available.
