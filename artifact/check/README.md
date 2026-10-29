# Orrery page checker

Decides whether an HTML page is an Orrery page, whatever its layout. Judges what renders (computed styles), not the markup. Tokens: `snapshot/tokens.json`.

```
node check/check.mjs <file.html|url> [...] [--json] [--theme light|dark|both] [--widths 375,1280] [--tokens tokens.json]
node check/test.mjs        # kitchen-sink + mutations + non-Orrery page; exits 0 when all behave
```
Baseline: token VALUES from `snapshot/tokens.json` (or `--tokens`, e.g. a Tuner export, so a declared hued preset is legal), never the page's own `:root`. Defaults: both themes (emulated `colorScheme`), widths 375 and 1280. Playwright is resolved from `ORRERY_PLAYWRIGHT`, then `import('playwright')`.

Exit codes: 0 all pages pass, 1 any page fails or fails to load, 2 bad usage.

## Rules
- `token-colors`: every resolved `:root` color token equals the baseline for the active theme, and every rendered color (text, background, visible borders and outlines, svg fill/stroke) equals a baseline token. Transparent and img/video/canvas/iframe content ignored. A hued accent passes if it is a token.
- `literal-values`: page-local `<style>` and `style=""` hold no color literals (hex, rgb, hsl, oklch, named) and no `box-shadow` other than `none` or `var()`. Only a block identical to head.py's output for the baseline (comments and whitespace aside) is skipped; a marker or padding does not exempt anything.
- `one-shadow`: at most one real shadow (box-shadow, text-shadow, `filter: drop-shadow`), on `.os-decisions.os-lift`; none in dark. Only a zero-offset zero-blur spread of 2px or less in the `--line` color (panel hairline) is exempt.
- `muted-on-layer2`: no `--text-muted` text on a `--layer-2` background.
- `contrast`: 4.5:1 for text (3:1 at 24px, or 18.66px bold), semi-transparent layers composited; text on gradients/images is skipped. The runner also Tabs through up to 40 stops: each focus ring needs 3:1 against the surface around it (worst of four sides).
- `fits-window`: at 375 no horizontal scroll. The runner clicks every `[aria-haspopup]`, `[aria-expanded=false]`, `summary` (up to 40) and plain `button` (up to 25, not form submits), reloading after any click that changed the page; also fails when html/body clip x-overflow while content sits past the edge; newly visible fixed/absolute elements, `[popover]`, `dialog[open]`, `[role=menu|listbox]` must sit 8px inside the viewport (sides; top and bottom for fixed), at both widths.
- `no-edge-bands`: no 2px+ left or right border whose other borders are at most half as wide (or transparent); horizontal gradient bars with a hard stop within 6px; best-effort 2-6px absolutely positioned bars pinned to a side (including `::before`/`::after`).
- `no-emoji-icons`: no `\p{Extended_Pictographic}` (arrows and (c)/(r)/tm are allowed), no `<i class*=icon>`, no icon fonts; svg `<text>` and `alt`/`aria-label`/`title` are scanned too. Inline svg inside a button or link is a warning only.

Exemption: `data-orrery-exempt="token-colors literal-values contrast"` plus `data-orrery-why` (15+ non-space chars, 3+ words) excludes that element and its descendants from the named rules (for user-supplied colors such as a swatch). Only those three rules are exemptable; inline styles only, never page-local `<style>`, never the `:root` token check. Max 5 hosts; html, body, main, article, `.os-doc/.os-front/.os-evidence` or any host over half the viewport is refused. A refused exemption is a failing item; accepted ones are listed as pass-true items with the reason.

`core.js` is browser-only (`globalThis.orreryCheck(document, opts)`), so the Tuner can load it against an iframe document. `fixtures/build-*.py` regenerate the kitchen sink and mutations.
