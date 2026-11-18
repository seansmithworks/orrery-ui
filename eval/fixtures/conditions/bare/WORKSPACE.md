# Workspace

A React 19 + TypeScript app with no component library.

- Styling: plain CSS. Put your styles in a CSS file next to `solution.tsx` and import it (`import "./solution.css"`), or use inline styles. CSS modules (`*.module.css`) work too.
- Brand: `brand.css` holds the brand variables (colours, spacing, radii, type sizes, the minimum touch target).

The host page that shows your work:

- loads `brand.css` (do not import it yourself);
- sets `data-brand` and `data-theme` on `<html>`, so the same page is shown in three brands: orrery light, orrery dark and solar;
- renders your default export as the whole page, with no wrapper, background or padding of its own.

The page must follow whichever brand is active.
