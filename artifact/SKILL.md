---
name: artifact-house-style
description: Use when building or publishing an interactive or visual HTML Artifact page (tool, tuner, gallery, comparison, dashboard, spike, prototype, review board) or when asked for "house style". Composes the page from the Orrery Artifact tokens and primitives (white page, grey layers, answer first, no hue) and gates it on the checker. Plans, specs, memos and reports go to Claude Docs, not here. Not for product UI in a project with its own DESIGN.md, nor slides, decks or Design canvases.
---

# Artifact house style (Orrery Artifact), v5

Compose the page for what it shows. Four layers, in order of authority.

1. **Tokens** (required): `snapshot/tokens.json`, emitted by `python3 -I head.py` into one `<style>` (replace `<!--HEAD-->` in `template.html`). The only source of values: write `var(--name)`, never a literal.
2. **Primitives** (required vocabulary): read `snapshot/README.md` before writing. Surfaces and layers with the one lift, text roles, chips with fixed meanings, controls and their states, the grid, menus and overlays that stay inside the window with an 8px gutter.
3. **Rules** (hard, enforced by `check/`): below.
4. **Examples** (optional): the five page modes and `snapshot/components/*.html` are shown, never required, never copied as-is. Use the `os-` primitives for standard elements (tables, lists, chips, controls); write your own markup for layouts and anything the primitives don't cover, matching their spacing, rules and type roles.

## Routing boundary

- **Claude Docs**: plans, specs, architecture docs, memos, status/research reports, anything the owner reads, comments on, or edits. Default; do not build these here.
- **Orrery Artifact (this skill)**: interactive or visual pages: tools/tuners, galleries, comparisons, dashboards that aren't the Dashboard type, spikes, prototypes, review boards.

## Gate

Before publishing: `node check/check.mjs page.html`. Publish only on exit 0. For user-supplied colors (swatch, picker), put `data-orrery-exempt="token-colors literal-values"` and `data-orrery-why="…"` on the smallest element that shows them (max 5 per page; why ≥15 characters and ≥3 words), never a page wrapper. Exemptable rules: `token-colors`, `literal-values` (inline styles only), `contrast`.

## Rules

- Answer first on any page that answers something: the `lead` is the decision or state, one sentence, before anything else.
- No hue and no status colors; every color is a token. Status is a word in a chip.
- Chips have fixed meanings, quiet to loud: `outline` settled (done, pass, ready), `fill` neutral tag (PR #, counts not in view), `dashed` absent or pending (next, not started, optional), `strong` needs attention (you, running, partial), `solid` blocked (blocker, fail) and nothing else.
- One shadow per page, the lift, and none in dark. Never a second.
- `text-muted` never on layer-2 (insets, callouts, filled chips, code, controls, the checked choice).
- Text and focus rings meet contrast; the page works at 375px with a 16px gutter and no horizontal scroll.
- Menus, popovers and dialogs stay inside the window with an 8px gutter.
- No edge bands: no side stripe or bar on any block, quote, callout or row.
- No emoji, no icon fonts, no icons; words, mono labels and → ← only.
- Don't invent new `os-` classes; use page-local names (tokens only, `var(--…)`).
- Decisions sheet (`.os-decisions.os-lift`): required only when the page asks the reader to decide something; otherwise optional.
- Script is allowed for interaction and state. Styling and theme never come from script: dark mode is `prefers-color-scheme` from head.py; `[data-theme]` on `<html>` is a manual override only.
- `h1.title` is the only required piece. A toc, if any, uses the `h2` text verbatim. When rebuilding a page, keep its section heads verbatim.
- A page-local pattern reused on 2 or more pages is a candidate for promotion into primitives. Note it in your report; a human or reviewer promotes it.

## Labels

- No eyebrow or kicker: nothing sits above a title or heading to categorize, date or restate it.
- Say it once: status goes in the lead sentence; date, branch and source go in the footer line, never a meta line, key-value rows or a chip.
- A label, chip or count stays only if the reader acts on it or it holds data nothing beside it holds. A chip marks the exception row, never every row; no count of what is in view.
- Mono caps (`label`) is for data only: table and tally headers, scale steps, row keys, the toc. Never a kicker, a header over a note, or a sentence.
- Section headings only where the reader jumps or would misread the block; no numerals on headings or index cards. Add no label the source doesn't supply.

## Artifact contract

- `<title>` is a 2-4 word name; `body` has an explicit background (head.py sets it); external stylesheets only from Google Fonts (this system loads none).

## Precedence

A project's DESIGN.md wins for that project's product UI. This system wins for Artifact pages. The built-in artifact-design contract (title, size, CDNs) still applies.
