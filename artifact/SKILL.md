---
name: artifact-house-style
description: Use when building or publishing an interactive or visual HTML Artifact page (tool, tuner, gallery, comparison, dashboard, spike, prototype, review board) or when asked for "house style". Builds it from the Orrery Artifact design system (white page, grey layers, answer first, no hue). Plans, specs, memos and reports go to Claude Docs, not here. Not for product UI inside a project that has its own DESIGN.md, and not for slides, decks or Design canvases, which use the Design System natively.
---

# Artifact house style (Orrery Artifact)

Every Orrery Artifact page uses this system, release v4.3.1 (`snapshot/VERSION`). It works from a local snapshot, so subagents can use it.

## Routing boundary

- **Claude Docs** (`claude.ai Claude Docs` connector): plans, specs, architecture docs, memos, status/research reports, anything the owner reads, comments on, or edits. Default; do not build these here.
- **Orrery Artifact (this skill):** interactive or visual pages: tools/tuners, galleries, comparisons, dashboards that aren't the Dashboard type, spikes, prototypes, review boards.

## Build

1. Copy `template.html`.
2. Run `python3 -I head.py` and replace `<!--HEAD-->` with its output.
3. Read `snapshot/README.md` (mode choice, anatomy, class index) before writing markup.
4. Copy component markup from `snapshot/components/<Name>.html`. Do not write component markup from memory.
5. Fill the template. Answer first: the `lead` is the decision, one sentence.

## Rules

- Rail is the default mode. Switch mode only by the README's content rules, via `data-mode` on `<body>`. In rail the front scrolls with the page and the toc (`nav.os-toc--side`, a direct child of `.os-doc`) runs as a row above the evidence.
- A page that collects answers (checkboxes, choices, notes) uses memo mode, one `.os-sec` per question.
- A page that is mainly images or mockups to inspect uses `data-mode="gallery"`: one `figure.os-plate` per image, each about one screen, the image linking to its full-size file.
- `h1.title` is the only required piece. The toc appears in rail and gallery modes only, with 4 or more sections, using the `h2` text verbatim. When rebuilding a page, keep its section heads verbatim unless one carries status or metadata, which moves to the lead or footer.
- Everything that waits on the reader goes in `.os-decisions` as `li.os-dec`: decision (with `.os-inset`), ask or to-do (no inset), options (`fieldset.os-choices` or `ul.os-list`), or checkable (`label.os-check`). Head in the source's words, else "Waiting on you".
- Chips have fixed meanings, quiet to loud: `--outline` settled (done, pass, ready), `--fill` neutral tag (PR #, counts not already in view), `--dashed` absent or pending (next, not started, optional), `--strong` needs attention (you, running, partial), `--solid` blocked (blocker, fail) and nothing else. Chip-led rows use `.os-list--status`.
- Never paste token values; use `var(--name)` or a class.
- Never invent `os-` classes; every one is in the README class index. A one-page need may use a second `<style>` labelled `page-local`: tokens only, no shadow, no new `os-` prefix.
- One shadow per page: `.os-lift` on `.os-decisions`. Never add a second.
- `text-muted` never on layer-2 (insets, callouts, filled chips, code, controls, the checked choice tile).
- No hue and no status colors; status is a word in a chip. No emoji, no icons.
- Script only for form state. A page may carry a script only to save or restore what the reader enters, and it may only toggle native state and attributes. Styling and theme never use script: dark mode comes from `prefers-color-scheme` in the head.py output, and `[data-theme]` on `<html>` stays a manual override only.

## Labels
- No eyebrow or kicker: nothing sits above a title or heading to categorize, date or restate it.
- Say it once: status goes in the lead sentence; date, branch and source go in the footer line, never a meta line, key-value rows or a chip.
- A label, chip or count stays only if the reader acts on it or it holds data nothing beside it holds. A chip marks the exception row, never every row; no count of items already in view.
- Mono caps (`label`) is for data only: table and tally headers, scale steps, row keys, the toc. Never a kicker, a header over a note, or a sentence.
- Section headings only where the reader jumps or would misread the block; no numerals on headings or index cards. Add no label the source and the previews don't supply.

## Artifact contract (still applies)

- `<title>` is a 2-4 word name.
- `body` has an explicit background (head.py sets it).
- External stylesheets only from Google Fonts. This system loads none.
- Works at 375px with a 16px gutter, no horizontal scroll.

## Precedence

A project's DESIGN.md wins for that project's product UI. This system wins for Artifact pages. The built-in artifact-design contract (title, size, CDNs) still applies.
