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

## Gates

`npm run tokens:build` stops on invalid DTCG (Terrazzo) and on a color whose `hex` and `components` disagree. It writes only after everything built, and removes anything else from the output folder; `--out` must be a folder outside the repo.

`npm run tokens:check` rebuilds into a temp folder and fails, with one line per gate, when:

- **drift**: the rebuild differs from the committed `generated/`.
- **snapshot**: the generated `tokens.json` does not deep-equal `artifact/snapshot/tokens.json`. The line names the first differing key.
- **head.py**: a generated CSS file's custom properties differ from `artifact/head.py`'s output, with no brand and for each client brand. The line names the first differing declaration. `bundle.css` is outside the comparison.

`node tokens/test.mjs` proves each gate passes on the real tree and fails on a seeded input. CI runs all three.

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
