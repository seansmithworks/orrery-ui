# orrery-ui (package: @orrery-ui/iris)

`DESIGN.md` is the source of truth for every design value and for the motion principles the morph must obey. Read it before touching `src/styles.module.css`, `src/motion.ts`, or any example page.

## Design Quality

**Active Preset:** `refined-minimal`

**Reference URLs:**
- https://vaul.emilkowal.ski/ — drawer open/close smoothness bar
- https://family.co/ — drawer continuity and settle-feel bar
- https://seansmithdesign.com/ — the ContactSheet this package was extracted from

**Project Overrides:**
- Motion is governed by `DESIGN.md` → Motion Principles, not the preset's Motion section. The preset forbids staggers and durations over 400ms; the morph is a spring that settles in ~640ms with staggered items, and that is the product.
- Package defaults are the neutral palette in `README.md`'s theming table; the example pages match it. Warm is an alternate palette. Both are documented in `DESIGN.md`.
