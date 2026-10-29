Orrery Artifact: a white page, flat grey layers, the answer first. Interactive or visual Claude Artifact pages (tools, tuners, galleries, comparisons, dashboards, spikes, review boards) are composed in four layers.

1. **Tokens (required).** `tokens.json`, emitted by `head.py`. The only source of values; write `var(--name)`, never a literal.
2. **Primitives (required vocabulary).** Surfaces and layers with the one lift, text roles, chips with fixed meanings, controls and their states, the grid, and menus or overlays that stay inside the window with an 8px gutter. Reference: Visual foundations, Content rules and the Class index below.
3. **Rules (hard).** Enforced by `check/check.mjs`; listed in `check/README.md`. Publish only when it exits 0. User-supplied colors (a swatch, a color picker) take `data-orrery-exempt="token-colors literal-values"` plus `data-orrery-why="…"` on the smallest element that shows them, never a page wrapper; give a real reason (at least 15 characters and 3 words), at most 5 per page, and only `token-colors`, `literal-values` (inline styles only) or `contrast` may be exempted.
4. **Examples (optional).** The five page modes and `components/*.html` are shown, never required, never copied as-is. Use the `os-` CSS in `bundle.css` where it fits, or write your own markup and page-local classes (tokens only; do not invent new `os-` classes, so the namespace stays meaningful).

## Examples: page modes

Optional. A mode is set with `data-mode` on `<body>`; the layout may equally be your own. These show what each mode suits.

- **Rail (default).** Leave `data-mode` off, or set `data-mode="rail"`. The front (head, answer, decisions) sits on the page in the left column and scrolls with it at full height; the toc runs as a row above the evidence in the right column. Use it unless another mode fits better.
- **Memo.** `data-mode="memo"`. One reading column at `layout-read`, for a short note with a single answer. A page that collects answers (checkboxes, choices, notes) suits memo mode, with one `.os-sec` per question.
- **Report.** `data-mode="report"`. An index of short answers, then each section with its question pinned in a sticky side column. Use it for pages that answer several questions.
- **Panel.** `data-mode="panel"`. Everything becomes 12-column cells on the page, cut by hairlines, at `layout-wide`. The decisions cell spans two rows, and the first evidence section sits under the answer beside it. Use it for dense status: stats, ramps, tables.
- **Gallery.** `data-mode="gallery"`. The front becomes a compact full-width band, and each image is an `.os-plate` sized to fill about one screen, with its copy beside it from 1300px on a landscape screen (3:2 or wider) and under it otherwise. Use it when the content is mainly images or mockups to be inspected (a mild2wild ladder, screen mocks); the image links to its full-resolution file.

## Examples: page anatomy

One worked anatomy for the modes above. No piece of chrome may add a word the content doesn't supply. Only `h1.title` is required; every other piece appears when the content has something to put in it.

1. **Memo head:** `.os-masthead > h1.title`, nothing else. No eyebrow or kicker above it and no key-value head: status goes in the lead, and date, branch and source go in the footer. A record page that needs fields uses a headerless `.os-table`.
2. **Answer:** `.os-answer`. One `lead` sentence, with `.os-support` prose under it. Omit a label above the lead by default; the lead sentence marks the answer. Use one only when the source names it. On a status page the answer may also hold an `.os-tally`, `.os-steps` or `.os-list` under the lead.
3. **Decisions:** `.os-decisions.os-lift`. Required only on pages that ask the reader to decide something. The one raised sheet, holding everything that waits on the reader, one `li.os-dec` per item. Every row is two columns, number then body, and everything else stacks under the body. Four kinds: a **decision** (`subhead`, `.os-dec-why`, then an `.os-inset` whose `.os-rec-v` opens with the source's word as a `<strong>` lede-in: Recommended:, Strawman: or Default:); an **ask or to-do** (`subhead` and why, no inset); **options** (`fieldset.os-choices` whose `legend.subhead` holds the question when interactive, or `subhead` then `ul.os-list` when static); and a **checkable** row (`label.os-check` replaces the number and body). The head is `h2.os-sh` in the source's own words ("Your calls", "Decisions you own"), or "Waiting on you" when the source has none. No "N open" chip: the rows are already in view.
4. **toc:** rail and gallery modes only, and only with 4 or more evidence sections. It sits between the front and the evidence: `nav.os-toc.os-toc--side` in rail, where it runs as a row above the evidence, and the horizontal `nav.os-toc` row in gallery. Its labels are the `h2` text verbatim, and its first entry links to the decisions sheet when one exists.
5. **Evidence:** `.os-sec` blocks, each opening with `h2.os-sh.heading`; an `h3.subhead` may split a section. Inside, use `.os-list`, `.os-steps`, `.os-table`, `.os-ledger`, `.os-tally`, `.os-scale`, `.os-callout`, `.os-disclosure` or the Fields controls. A section heading only where the reader jumps or would misread the block. No numerals on section heads or index cards.
6. **Footer:** optional `.os-footer`, last in the evidence, and the one home for date, branch and source. A sentence is `p.os-footer.body-sm.os-muted`; a short label stays `p.os-footer.label`.

Skeleton: `main.os-container > article.os-doc > div.os-front (head, answer, decisions) + div.os-evidence (sections, footer)`. Rail mode adds `nav.os-toc.os-toc--side` as a direct child of `.os-doc`, between the front and the evidence; report mode adds `.os-index` to the front. Gallery mode adds `nav.os-toc` in the same place and fills sections with `figure.os-plate > a.os-plate-media[href][target=_blank] > img[width][height]` plus `figcaption.os-plate-copy` (title in `heading`, copy in `body`).

## Content rules

- **Answer first.** Write the `lead` as the decision itself, in one sentence. Never open with background. On a status page, the lead is the state plus what matters next ("Landed on the branch, not on prod; 5 things wait on you."). When rebuilding frozen content that has no such sentence, put the source's verdict or scope line in `p.subhead` inside `.os-answer`.
- **Bold lede-in, muted rest.** Prose rows and paragraphs open with a `<strong>` phrase in `text`, then continue in `text-muted` (`.os-list`, `.os-steps`, `.os-muted`). List and step rows with no lede-in read fully in `text`.
- **Mono for scanning, sans for reading.** Put dates, IDs, counts, keys and table headers in `label` or `data`. Never set sentences in mono. Inside a `label`, wrap branches, SHAs and paths in `<samp>` so they keep their case.
- **One shadow, only on decisions.** `.os-lift` appears once per page, on `.os-decisions`. No other element gets a shadow, and dark mode has none.
- **Muted text never on `layer-2`.** `text-muted` reads on `page` and `layer-1` only. On insets, callouts, filled chips, code, controls, the hovered side-toc link, the hit table row, the checked choice tile and panel tally cells, use `text`. bundle.css enforces this by rebinding the custom property `--text-muted` to `var(--text)` on each layer-2 fill, so every muted descendant resolves to `text`; a new layer-2 fill must join that one `:is()` list.
- **Section heads.** Section heads are `heading`. Phrase them as the question the section answers when writing new content; when rebuilding a page, keep the source heads verbatim. `label` is the data role (column and tally headers, keys, scale steps, toc), never an eyebrow or section head.
- **Status is a word in a chip.** The system has no status colors. Each chip class has one fixed meaning, quiet to loud:

  | Class | Meaning | Words |
  |---|---|---|
  | `.os-chip--outline` | settled | done, pass, secured, ready, covered |
  | `.os-chip--fill` | neutral tag | PR #, counts not already in view |
  | `.os-chip--dashed` | absent or pending | next, not started, optional, missing, waived |
  | `.os-chip--strong` | needs attention | you, running, partial |
  | `.os-chip--solid` | blocked | blocker, fail, blocked: this meaning only |

  A chip marks the exception row, never every row. When every row of a list opens with a chip, use `.os-list.os-list--status` so the chips share a column and the lede text starts at the same x.
- Use the ramp (`scale-1…5`) for ordinal data only, never for status.
- **Script for interaction and state.** Allowed. Styling and theme never come from script: dark mode is `prefers-color-scheme` in the head.py output, and `[data-theme]` on `<html>` is a manual override only.
- **Page-local classes.** Write your own markup and classes in a second `<style>` labelled `page-local`: `var(--…)` only, no color literals, no shadow, no new `os-` prefix. A pattern reused on 2+ pages is proposed for promotion into primitives (note it in the report; a human or reviewer promotes it).

## Visual foundations

- **Color:** monochrome. `page` white, `layer-1` and `layer-2` flat greys, `line` an 8% hairline. `accent` equals `text` in this preset, so there is no hue. `accent` covers exactly two roles: the focus ring and the primary button. Selected segments, solid chips, and checkbox/radio marks use `text` (ink on `page`). Text meets 4.5:1 in both themes (the checker's `contrast` rule). Field borders use `text-muted`, not `line`, so they stay visible against the page.
- **Type:** system sans and mono only; no web fonts load. Text roles are the type-style classes tokens.css compiles (`title`, `lead`, `heading`, `subhead`, `body`, `body-sm`, `caption`, `stat`, `label`, `data`). Add them in markup, and put `body` on `<body>`. bundle.css only adds uppercase and `text-muted` to `label` (and case-true `samp` inside it), tabular numerals to `data` and `stat`, `text-wrap` to `title` and `lead`, and smaller `title`/`lead` sizes under 600px.
- **Literal exceptions:** tokens.json has no family for these, so bundle.css holds them as literals: the motion values below; font weights 600 (`strong`, `.os-rec-v`, `.os-ledger .r`, `.os-chip--solid`), 500 (table mobile labels) and 400 (disclosure marker); `0.86em` on `code`; `0.78em` and `0.79em` on step numbers and table mobile labels; `0.08em` tracking on those labels; the 32px `title` and 21px `lead` under 600px; and the gallery's viewport units (`100vw` width, `100svh` plate height). Everything else is a token var.
- **Shape:** `radius-panel` (10px) on layers, `radius-control` (6px) on what sits inside them, `radius-round` for true circles only. No pills on text.
- **Strokes:** `line-width` for every hairline and rule, `ring-width` for focus. No edge bands: never mark a block or row with a side stripe.
- **Focus:** a solid `ring-width` outline in `accent`, offset by `ring-width`. It is meant to meet 3:1 on every surface. Checkbox rows and choice tiles carry the ring on the whole row.
- **Motion:** 150ms `cubic-bezier(.23,1,.32,1)`, with a `scale(.97)` press on controls and a 1px hover lift on index cards. tokens.json has no motion family, so these values live in bundle.css as `--bundle-dur` and `--bundle-ease`. Every transition sits behind `prefers-reduced-motion: no-preference`.
- **Responsive:** breakpoints at 600, 860 and 1100px, plus 1300px for gallery plates. Every layout works at 375px with no horizontal scroll: multi-column layers stack, tables become labeled blocks (headerless tables stack at full width), and gutters drop to `space-16`.
- **Iconography:** none. Use words, mono labels and the arrows → and ←. No emoji.

## Using on an Artifact page

1. Build the head with the `artifact-house-style` skill's `head.py`. It emits one `<style>`: the tokens in the Artifact contract shape (light on `:root`, dark in a `prefers-color-scheme` block, `[data-theme]` as a manual override), then `components/bundle.css`. The page follows system appearance with no script.
2. Write `<body class="body">`, then compose the layout (an example mode is optional).
3. Never paste token values into the page. Reference `var(--name)` or use a class.
4. Run `node check/check.mjs page.html` and fix until it exits 0.

## Class index

Every `os-` family in bundle.css, with its role and the example card that shows it. Optional to use; the primitives they express are not.

- `.os-container`, `.os-doc`, `.os-front`, `.os-evidence`, `.os-sec`, `.os-masthead` (page flow, per mode): MemoMode, RailMode, ReportMode, PanelMode, GalleryMode; `.os-masthead` in MemoHead.
- `.os-plate`, `.os-plate-media`, `.os-plate-copy` (one inspectable image linked to its full-size file, with its copy; screen-sized in gallery mode): GalleryMode.
- `.os-row`, `.os-row--rail`, `.os-cols`, `.os-cols--3`, `.os-cols--4`, `.os-cells`, `.os-span-2`, `.os-span-5`, `.os-span-6`, `.os-span-7`, `.os-span-12` (grid primitives): Grid.
- `.os-sheet`, `.os-lift`, `.os-inset`, `.os-callout`, `.os-callout--dashed` (layered surfaces and the one shadow): Sheet.
- `.os-footer` (page footer, the one home for date, branch and source): MemoHead.
- Retired, kept in bundle.css only so pages already built with them still render; never use them in new markup: `.os-meta`, `.os-kv`, `.os-sh-n` and the `b.label` numeral in `.os-index .qq`. `.os-meta--bar` is removed.
- `.os-sh` (section head): ReportMode.
- `.os-chip`, `.os-chip--fill`, `.os-chip--outline`, `.os-chip--strong`, `.os-chip--dashed`, `.os-chip--solid` (word chips, one fixed meaning each): Chip.
- `.os-answer`, `.os-support` (lead, prose): Answer.
- `.os-decisions`, `.os-decisions-head`, `.os-dec`, `.os-dec-n`, `.os-dec-why`, `.os-rec-v` (the sheet of everything that waits on the reader): Decisions.
- `.os-check`, `.os-choices`, `.os-choice`, `.os-field` (checkbox row, choice tiles and their fieldset, note field): Fields.
- `.os-scale`, `.os-scale-cap` (ordinal value ramp): Scale.
- `.os-list`, `.os-list--status`, `.os-steps` (muted prose rows, chip-led status rows, numbered steps): List, Steps.
- `.os-muted` (muted run of prose): TextRoles.
- `.os-tally` (stat strip): Tally.
- `.os-ledger` (field and result rows): Ledger.
- `.os-table`, `.os-table-wrap` (table that stacks under 600px): Table.
- `.os-index`, `.os-toc`, `.os-toc--side` (report index cards, toc chips, and the rail toc, a direct child of `.os-doc` that runs above the evidence): Navigation.
- `.os-disclosure` (details row): Disclosure.
- `.os-seg`, `.os-button`, `.os-theme` (segmented control, button, theme toggle): Controls.
