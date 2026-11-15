# orrery-ui (package: @orrery-ui/iris)

`DESIGN.md` is the source of truth for design decisions and for the motion principles the morph must obey. It names the tokens and holds no values; values live in the token source under `tokens/` and in the package's own CSS and TS (`src/styles.module.css`, `src/motion.ts`), and `npm run tokens:check` fails when `DESIGN.md` names something that does not exist. Read it before touching `src/styles.module.css`, `src/motion.ts`, or any example page.

## Design Quality

**Active Preset:** `refined-minimal`

**Reference URLs:**
- https://vaul.emilkowal.ski/ — drawer open/close smoothness bar
- https://family.co/ — drawer continuity and settle-feel bar
- https://seansmithdesign.com/ — the ContactSheet this package was extracted from

**Project Overrides:**
- Motion is governed by `DESIGN.md` → Motion Principles, not the preset's Motion section. The preset forbids staggers and durations over 400ms; the morph is a spring that settles in ~640ms with staggered items, and that is the product.
- Package defaults are the neutral palette: the `var()` fallbacks in `src/styles.module.css`, listed in `README.md`'s theming table; the example pages match it. Warm is an alternate palette. `DESIGN.md` names the variables for both; their values live in code.
