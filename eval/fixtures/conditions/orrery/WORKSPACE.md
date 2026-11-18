# Workspace

A React 19 + TypeScript app with the Orrery UI kit.

- Components: the kit in `kit/`. Import UI from `"./kit"`. Its catalog is `kit/catalog.json`, with a `*.catalog.json` and a `*.example.tsx` beside each component.
- Design rules: `DESIGN.md`. Checkable rules: `tokens/rules/`.
- Brand: the token CSS in `tokens/generated/css/` holds the brand variables (colours, spacing, radii, type sizes, the minimum touch target).

The host page that shows your work:

- loads the brand variables and `kit/kit.css` (do not import them yourself);
- sets `data-brand` and `data-theme` on `<html>`, so the same page is shown in three brands: orrery light, orrery dark and solar;
- renders your default export as the whole page, with no wrapper, background or padding of its own.

The page must follow whichever brand is active.
