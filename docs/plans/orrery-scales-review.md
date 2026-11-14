# Orrery scales: values for your review

The token source now holds type steps, a grid, breakpoints, a hit-target floor, elevation levels and the five dialled Iris springs. Nothing on any page or component changes: no product reads these yet. Every value below was copied from a product, with the file and line it came from. `site:` means `~/Code/seansmithdesign.com/`; every other path is in this repo.

## Calls I made, each with my pick

Redline any of these; the rest of the page is the evidence.

1. **The type ladder is both products' sizes side by side, 18 steps.** Artifact's ten sizes stay, and the site's named sizes plus Solar's 10px are added. That leaves five near-twins: 12 and 12.5, 16 and 17, 20 and 22, 24 and 25, 28 and 30. My pick: keep both for now. Merging a pair changes how Artifact pages or the site look, so it is a visible step for later.
2. **Line heights follow one rule.** A size Artifact already uses keeps the line height Artifact gives it. A new size takes the line height the site or Solar uses most. Two steps then differ from the site's own habit: 13 is 1.45 here (site: 1.6) and 16 is 1.6 here (site docs pages: 1.65).
3. **28's line height is a four-way tie**, one use each. I took Solar's 1.15.
4. **The site's "13px" body size is really 12.8px** (`0.8rem`). The step is 13, which is what Artifact, Solar and the site's own hand-typed rules use.
5. **Breakpoints are 480, 768, 1024, 1280, 1600.** These are the four widths where the site's side margins step, plus 768, a width the site uses heavily and the one Iris uses. Left out: Artifact's 600, 860 and 1100, Solar's 640, and the case-study pages' 560 and 900.
6. **Hit target is 44, and the build refuses anything smaller.** 44 is used far more than 48. A brand can raise it to 48, which is what the Iris trigger and the site's phone action buttons use today.
7. **Elevation has four levels; brand orrery draws three.** Levels 0 to 2 use fills and the hairline Artifact already has. Level 3 (things that float: menus, popovers, the Iris sheet) has no drawing, because Artifact has nothing that floats. Strawman for you to react to: page fill with the heavy `line-strong` hairline. I did not build it.
8. **Five springs are promoted, all in the form they were dialled in.** The close-button springs are left out: they are not on `DESIGN.md`'s dialled list. If you did dial them, say so and they go in.
9. **Names are a first draft**: `breakpoint-480`, `grid-margin-tablet`, `hit-target-min`, `level-0` to `level-3`, `iris-shared-open`. Breakpoints are named by number because the site's words (tablet starts at 480) do not fit 768.

## Type steps

Token names are `type.size.<step>` and `type.line-height.<step>`. "Existing" sizes were already in the source and are unchanged; only their line height is new.

| Step | Size | Size source | Line height | Line height source | Alternatives seen |
| --- | --- | --- | --- | --- | --- |
| 10 | 10px (new) | `site:src/solar/ui/ui.module.css:59` (Solar uses 10px in 17 rules) | 1.3 | `site:src/solar/ui/ui.module.css:60` | None: every other 10px rule sets no line height |
| 11 | 11px (existing) | `artifact/snapshot/tokens.json:266` | 1.4 | `artifact/snapshot/tokens.json:267` | Solar captions 1.7 (4 uses, `site:src/solar/detail/templates/DesktopA.module.css:124`), 1.8 (3 uses) |
| 12 | 12px (new) | `site:src/app/globals.css:27` (used 792 times) | 1.4 | `site:src/app/affirm/(docs)/intro/IntroPage.module.css:247` (28 uses) | 1 (11 uses), 1.2 (4 uses), 18px (3 uses) |
| 12-5 | 12.5px (existing) | `artifact/snapshot/tokens.json:275` | 1.5 | `artifact/snapshot/tokens.json:276` | None |
| 13 | 13px (existing) | `artifact/snapshot/tokens.json:243` | 1.45 | `artifact/snapshot/tokens.json:244` | Site body 1.6 (53 uses, `site:src/app/affirm/(docs)/capcalls/demo/DemoPage.module.css:75`), 1.5 (23 uses). Site body size is 12.8px (`site:src/app/globals.css:28`) |
| 14 | 14px (existing) | `artifact/snapshot/tokens.json:235` | 1.5 | `artifact/snapshot/tokens.json:236` | 20px (2 uses, `site:src/app/lab/orrery/(docs)/iris/iris.module.css:829`), 1.6 (1 use) |
| 16 | 16px (existing) | `artifact/snapshot/tokens.json:227` | 1.6 | `artifact/snapshot/tokens.json:228`; also Solar (`site:src/solar/detail/templates/DesktopA.module.css:140`) | Site docs pages 1.65 (28 uses, `site:src/app/affirm/(docs)/OverviewPage.module.css:193`), 1.5 (21 uses) |
| 17 | 17px (existing) | `artifact/snapshot/tokens.json:218` | 1.3 | `artifact/snapshot/tokens.json:219` | None |
| 20 | 20px (new) | `site:src/app/globals.css:30` (used 67 times) | 1.5 | `site:src/app/affirm/(docs)/OverviewPage.module.css:70` (28 uses) | Solar 1.4 (2 uses, `site:src/solar/detail/templates/DesktopA.module.css:133`) |
| 22 | 22px (existing) | `artifact/snapshot/tokens.json:209` | 1.25 | `artifact/snapshot/tokens.json:210` | None |
| 24 | 24px (new) | `site:src/app/globals.css:31` (used 83 times) | 1.1 | `site:src/app/affirm/(docs)/OverviewPage.module.css:159` (22 uses) | Solar 1.3 (2 uses), 1.05 (1 use) |
| 25 | 25px (existing) | `artifact/snapshot/tokens.json:200` | 1.3 | `artifact/snapshot/tokens.json:201` | None |
| 28 | 28px (new) | `site:src/app/globals.css:32` (used 36 times) | 1.15 | `site:src/solar/ui/ui.module.css:482` (1 use) | 1.02, 1.1, 1.25 (1 use each): a tie |
| 30 | 30px (existing) | `artifact/snapshot/tokens.json:251` | 1 | `artifact/snapshot/tokens.json:252` | Solar 1.15 (1 use, `site:src/solar/look/base/base.module.css:325`) |
| 44 | 44px (existing) | `artifact/snapshot/tokens.json:191` | 1.06 | `artifact/snapshot/tokens.json:192` | None |
| 64 | 64px (new) | `site:src/app/globals.css:33` (used 35 times) | 1.05 | `site:src/app/affirm/(docs)/capcalls/design-system/DesignSystemPage.module.css:34` (21 uses) | 1.02 (1 use), 0.9 (1 use) |
| 80 | 80px (new) | `site:src/app/globals.css:34` (used 11 times) | 1.02 | `site:src/app/affirm/(docs)/OverviewPage.module.css:46` (7 uses) | None |
| 96 | 96px (new) | `site:src/app/globals.css:35` (used 6 times) | 1.02 | `site:src/solar/fullpage/SolarFullPage.module.css:89` (1 use) | None |

Sizes seen and left out:

- **9px** is the site's badge size (`site:src/app/globals.css:140`, 49 uses). It is under the 10px floor this work was asked to cover.
- **112px** is defined on the site (`site:src/app/globals.css:36`) and used nowhere.
- **15, 18, 40 and 56px** are one-off sizes on the site and the Orrery docs pages (`site:src/app/lab/orrery/theme.module.css:19`), not steps in either product's scale.

## Grid

| Token | Value | Source | Alternatives seen |
| --- | --- | --- | --- |
| `grid-columns` | 12 | `site:DESIGN.md:547`, `site:src/app/globals.css:1902` | Site spec says 4 columns on phones (`site:DESIGN.md:598`); its CSS uses 1 or 2 |
| `grid-gutter-tight` | 16px | `site:src/app/globals.css:103` | None |
| `grid-gutter-standard` | 24px | `site:src/app/globals.css:104` | None |
| `grid-gutter-roomy` | 32px | `site:src/app/globals.css:105` | None |
| `grid-margin-mobile` | 16px | `site:src/app/globals.css:113` | Artifact agrees: 16px on phones (`tokens/base/core.tokens.json:122`) |
| `grid-margin-tablet` | 32px | `site:src/app/globals.css:114` | Artifact agrees on 32px but starts it at 600 (`artifact/snapshot/bundle.css:38`) |
| `grid-margin-laptop` | 56px | `site:src/app/globals.css:115` | Artifact agrees on 56px but starts it at 860 (`artifact/snapshot/bundle.css:43`, `artifact/snapshot/tokens.json:358`) |
| `grid-margin-desktop` | 80px | `site:src/app/globals.css:116` | Artifact stops at 56px |
| `grid-margin-wide` | 96px | `site:src/app/globals.css:117` | Artifact stops at 56px |
| `grid-max-width` | 1440px | `site:src/app/globals.css:99` | Artifact page widths 1240px and 1600px (`artifact/snapshot/tokens.json:348`, `:353`), already tokens |

Left out: the site's 8px baseline (`site:src/app/globals.css:100`), vertical gaps 48, 72, 104 (`:108` to `:110`) and reading widths 640, 720, 820 (`:123` to `:126`). The space scale and Artifact's reading widths already cover that ground.

## Breakpoints

Rule counts are left out: the site is a separate repo, and a count that this repo cannot reproduce is not a number to decide on. Sources point at where each width appears; the choice rests on which widths the site's margins step at (480, 1024, 1280, 1600) plus 768, which Iris already uses.

| Token | Value | Source | Alternatives seen |
| --- | --- | --- | --- |
| `breakpoint-480` | 480px | `site:src/app/globals.css:1242` | Case-study pages 560 |
| `breakpoint-768` | 768px | `src/useTriggerSize.ts:9`, `site:src/app/globals.css:1339` | Solar 640 (`site:src/solar/ui/ui.module.css:359`); Artifact 600 and 860 (`artifact/snapshot/bundle.css:38`, `:43`) |
| `breakpoint-1024` | 1024px | `site:src/app/globals.css:1248` | Site 900; Artifact 1100 (`artifact/snapshot/bundle.css:1105`) |
| `breakpoint-1280` | 1280px | `site:src/app/globals.css:1254` | Artifact 1300 (`artifact/snapshot/bundle.css:1122`) |
| `breakpoint-1600` | 1600px | `site:src/app/globals.css:1260` | None |

## Hit target

| Token | Value | Source | Alternatives seen |
| --- | --- | --- | --- |
| `hit-target-min` | 44px | `src/styles.module.css:360` (Iris close button), `site:src/solar/ui/SplitDetail.module.css:81`; 60 minimum-size rules on the site use 44 | 48px: Iris trigger hit area (`src/styles.module.css:65`, `DESIGN.md:112`), site phone action buttons (`site:src/app/globals.css:2294`), 6 minimum-size rules on the site |

## Elevation

Level names are shared by every brand. The drawing column is brand orrery's choice.

| Token | What it is for | Brand orrery draws it as | Source |
| --- | --- | --- | --- |
| `elevation.level-0` | The page itself | `page` fill, no line | `artifact/snapshot/tokens.json:16` |
| `elevation.level-1` | A surface on the page: sheets, panels, cards | `layer-1` fill, 1px `line` hairline | `artifact/snapshot/bundle.css:275` and `:276`, `artifact/snapshot/tokens.json:24` |
| `elevation.level-2` | A surface nested in level 1: insets, callouts, chips | `layer-2` fill, 1px `line` hairline | `artifact/snapshot/bundle.css:284` and `:285`, `artifact/snapshot/tokens.json:32` |
| `elevation.level-3` | A surface floating over the page: menus, popovers, the Iris sheet | Not drawn (call 7) | Name only. Iris sheet shadow `DESIGN.md:39`; site popover and tooltip shadows `site:DESIGN.md:540` and `:541` |

Alternatives seen: Artifact's one faint shadow (`artifact/snapshot/tokens.json:404`) is a single marked sheet, not a level, so it stays where it is. Iris keeps its own dialled shadows in `src/`, untouched.

## Springs

| Token | Value | Source | Alternatives seen |
| --- | --- | --- | --- |
| `iris-open` | stiffness 375, damping 42.5, mass 1.75 | `src/motion.ts:20` | None (same in `DESIGN.md:62`) |
| `iris-close` | stiffness 375, damping 32, mass 1 | `src/motion.ts:32` | None (`DESIGN.md:63`) |
| `iris-shared-open` | stiffness 500, damping 45 | `src/motion.ts:43` | None (`DESIGN.md:64`) |
| `iris-shared-close` | stiffness 340, damping 30, mass 1 | `src/motion.ts:57` | None (`DESIGN.md:65`) |
| `iris-snap` | stiffness 700, damping 52, mass 1 | `src/motion.ts:64` | None (`DESIGN.md:66`) |

Springs left out, and why:

- **Close-button reveal and rotate** (`src/motion.ts:121`, `:134`) are not on the dialled list in `DESIGN.md:124`.
- **Snappy and gentle presets** (`src/motion.ts:354`, `:374`) are marked as strawmen nobody has looked at by eye.
- **Phase 0's test spring** (`tokens/base/core.tokens.json:11`) stays as test data; it is a copy of `iris-open`.
