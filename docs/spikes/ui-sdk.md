# Spike: Vercel's UI SDK on the Dialog exemplar

Branch `spike/ui-sdk-dialog`, draft PR, never merged. Run 2026-11-15 against `@ui-sdk/*` 0.1.0-beta.5.

## Answer: (a) stay on Base UI, adopt only `checkPattern` as a test layer

The UI SDK Dialog matched the Base UI Dialog on every behaviour the kit tests, and was better in two places (`aria-modal`, top-layer stacking). It also doubled the dialog's gzipped bytes, and the library has been public for three days with five releases in that time. `checkPattern` ran against the unchanged Base UI Dialog with no kit changes and found one real gap. That test layer is worth having now. Moving the behaviour layer is not worth it at this maturity. Revisit (b) when UI SDK reaches 1.0, or if top-layer stacking becomes a kit requirement.

## Evidence

Packages (exact pins, devDependencies, spike branch only):

| Package | Version | Unpacked | Deps | Peers |
| --- | --- | --- | --- | --- |
| `@ui-sdk/core` | 0.1.0-beta.5 | 7.5M | none | none |
| `@ui-sdk/react` | 0.1.0-beta.5 | 3.6M | none | `react >=19`, `react-dom >=19`, `@types/react >=19.2.10`, `@ui-sdk/core ^0.1.0-beta.5` |

npm's `latest` tag points at beta.3 while `beta` is beta.5, so a plain `npm i @ui-sdk/react` installs an older build than the docs describe. The repo has React 19.2.8 and `@types/react` 19.2.17, so the peers are met.

`checkPattern(root, "dialog")` on the kit's live Base UI Dialog (`example/kit.html`, unchanged):

| Finding | Class | Why |
| --- | --- | --- |
| no `aria-modal="true"` on a modal dialog | real gap, low severity | Base UI 1.9 never sets it. It hides the page behind with `aria-hidden="true"` instead, so screen readers still get a modal. The APG modal pattern asks for the attribute. |
| "Escape should close it" | assumption mismatch | The check looks while the exit transition still holds the popup in the DOM. It passes with transitions off, and a trusted Escape closes the dialog and returns focus. |
| name, focus inside, Tab and Shift+Tab wrap, focus back to the trigger, Enter reopens | pass | |

The same check on the UI SDK Dialog: no problems, with transitions on or off.

Parity: `example/spike-ui-sdk.spec.ts` runs each row on one page, `example/spike-ui-sdk.html?impl=base|sdk`. 27 tests pass, headless, one worker.

| Behaviour | Base UI (kit) | UI SDK (spike) | Check |
| --- | --- | --- | --- |
| Named by title, described by description | yes | yes | `toHaveAccessibleDescription` |
| `aria-modal="true"` | no | yes | attribute read |
| Page behind hidden from assistive tech | `aria-hidden` on the app root | `inert` | `closest()` read |
| Focus moves in on open | to the corner Close | to the corner Close | test |
| Focus trap, Tab and Shift+Tab | yes | yes | six presses each way |
| Escape closes, focus returns to the trigger | yes | yes | test |
| A Close part closes, focus returns | yes | yes | test |
| Outside press closes | yes | yes | test |
| Scroll lock, place kept after close | yes (on `body`) | yes (on `html`) | wheel while open, `scrollY` |
| Portal outside the app root | yes, into `body` | yes, top layer, into `body` | ancestor chain |
| Above a page element with the highest z-index | no, stacks by `--orr-z-overlay` | yes, top layer | `elementFromPoint`, pinned as a difference |
| Nested dialog: Escape closes only the inner one | yes | yes | test |
| Reduced motion: opacity only; scale otherwise | yes | yes | per-frame transform samples |
| axe, WCAG 2.2 AA | 0 violations | 0 violations | `@axe-core/playwright` |
| `kit.spec.ts` and the kit baseline gate on the UI SDK Dialog | not verified | not verified | the specimen imports the kit, which this spike may not change |
| Touch open (focus to content) and the sheet presentation | not verified | not verified | |
| WebKit and Firefox | not verified | not verified | chromium only |

Build cost of the UI SDK Dialog:

| | Base UI (`kit/dialog`) | UI SDK (`spike/ui-sdk`) |
| --- | --- | --- |
| Component, code lines (all lines) | 108 (140) | 157 (181) |
| CSS beyond `kit/dialog/dialog.css` | none | 15 lines: centring and the `--space-8` gutter, because the top layer has no viewport part |
| JS, minified, gzipped | 24,552 bytes | 46,989 bytes |
| Of which kit Button, shared by both | 3,444 bytes | 3,444 bytes |

The UI SDK Dialog is longer because it adapts names: `disablePointerDismissal` to `closeOnOutsidePress`, `initialFocus={false}` to `"none"`, a `container` default of `document.body` to keep the kit's portal behaviour, and typed wrappers per part. Behaviours I had to write myself: none. Focus trap, return focus, Escape, outside press, scroll lock, inert and nesting all come from `@ui-sdk/react/dialog`.

Bundle command, from the repo root, for each entry (`kit/dialog/Dialog`, `spike/ui-sdk/Dialog`, `kit/button/Button`):

```sh
echo "export { Dialog } from './kit/dialog/Dialog'" | node_modules/.bin/esbuild --bundle --minify \
  --format=esm --loader=tsx --external:react --external:react-dom --external:react/jsx-runtime \
  --define:process.env.NODE_ENV='"production"' --outfile=out.js && gzip -9 -c out.js | wc -c
```

Agent bridge (`createAgent`, `snapshot`, `act`, `allow`): it does not overlap `kit/catalog.json`.
- The bridge works at runtime on a rendered page. It lets an agent read and operate live UI SDK components, so it sees nothing built on Base UI.
- The catalog works at design time. It tells an agent which kit components exist and how to compose them, so it can build a screen.
- They would sit side by side only if the kit moved to UI SDK behaviours, which is option (b).

## Risks

- Beta churn: first public build 2026-11-12, five releases in three days (beta.1 to beta.5). Every release after beta.1 lists behaviour changes in the changelog. Under the Vercel beta terms, APIs may change before general availability.
- API stability: each export is tagged `@stable` (follows semver) or `@experimental` (may change in any minor). The Dialog parts are `@stable`. `checkPattern` is `@experimental`. Every version is 0.x, so semver promises nothing yet.
- Repo signals at spike time: 103 open issues against 17 closed, 7 open PRs, no GitHub releases. Versions go out through changesets with all `@ui-sdk/*` packages released together.
- Option (a) risk is small: `checkPattern` lives in tests only. A breaking change fails a test, never the shipped kit. Pin it exactly and upgrade deliberately.

## What each option costs in Phase 3

- (a) One shared helper (the esbuild inject in `example/spike-ui-sdk.spec.ts`, about 30 lines) moves into the kit spec, plus one `checkPattern` test for each component that has a pattern: Checkbox, Radio (`radio-group`), Switch, Menu, Tabs, and Select (`combobox` or `listbox`). Popover is a non-modal `dialog`. Tooltip, Toast, Textarea, Card and Chip have no pattern. Run checks with transitions off. The `aria-modal` gap is probably a one-line kit fix (not tried) and is Sean's call. It is not part of this spike.
- (b) Rebuild all three exemplars (Button, Field, Dialog) and twelve new components on UI SDK. Rewrite every catalog `passthrough` (`@base-ui/react/...`) and the catalog README's Base UI guidance. Add a top-layer CSS adapter per popup part. Retire the `--orr-z-overlay` stacking and the `data-base-ui-focus-guard` test exclusions. Expect about twice the gzipped bytes per popup and re-test after every beta. Both libraries cover the Phase 3 list except Card and Chip, which neither has. UI SDK also ships a Textarea part.
- (c) No cost now. The `aria-modal` gap stays invisible until someone audits it by hand.
