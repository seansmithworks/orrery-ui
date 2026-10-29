# Artifact house style

A design system for Claude Artifact pages: a white page, flat grey layers, the
answer first, no hue. Four layers: tokens, primitives, hard rules, and optional
examples. `SKILL.md` is the agent entry point; `snapshot/README.md` is the
primitives reference.

## Install as a Claude Code skill

Copy or symlink this folder to `$HOME/.claude/skills/artifact-house-style/`.

## Build a page

`python3 -I head.py` prints one `<style>` block from `snapshot/tokens.json`.
Put it in place of `<!--HEAD-->` in `template.html`, then write the page with
the `os-` primitives and `var(--name)` tokens.

## Check a page

`node check/check.mjs page.html` needs Playwright (`ORRERY_PLAYWRIGHT` or an
installed `playwright` with a browser). Exit 0 means every rule passes. Scoped
exemptions for user-supplied colors are in `check/README.md`.

MIT, per the repository LICENSE.
