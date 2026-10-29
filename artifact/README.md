# Orrery Artifact design system

A design system for Claude Artifact pages: white page, flat grey layers, answer first, no hue. Packaged as a Claude Code skill (`SKILL.md`) with a local snapshot of tokens, CSS and component markup, so subagents can build pages without network access.

## Install

Copy or symlink this folder to `skills/artifact-house-style` inside your Claude config directory (`$HOME/.claude`):

```sh
ln -s "$(pwd)/artifact" "$HOME/.claude/skills/artifact-house-style"
```

## Build a page

1. Copy `template.html`.
2. Run `python3 -I head.py` and replace `<!--HEAD-->` with its output.
3. Read `snapshot/README.md` for mode choice, anatomy and the class index.
4. Copy markup from `snapshot/components/<Name>.html`.

## Contents

- `SKILL.md`: when to use the system and its rules.
- `template.html`, `head.py`: page skeleton and the `<style>` head.
- `snapshot/`: `tokens.json`, `bundle.css`, component previews, version.

This folder is not part of the npm package. MIT, see the repository `LICENSE`.
