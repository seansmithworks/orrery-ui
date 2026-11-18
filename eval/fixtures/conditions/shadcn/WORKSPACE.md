# Workspace

A React 19 + TypeScript app with shadcn/ui components (Radix UI primitives styled with Tailwind CSS v4).

- Components: `components/ui/` (button, input, label, textarea, select, switch, checkbox, radio-group, tabs, dialog, alert-dialog, dropdown-menu, popover, tooltip, card, badge, separator). Import them as `@/components/ui/<name>`; `cn()` is in `@/lib/utils`. Icons: `lucide-react`.
- Styling: Tailwind classes. Tailwind classes in your files are compiled automatically.
- Brand: `brand.css` holds the brand variables. `app.css` loads Tailwind and the theme that maps those variables to Tailwind colours (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border` and the rest).

The host page that shows your work:

- loads `brand.css` and `app.css` (do not import them yourself);
- sets `data-brand` and `data-theme` on `<html>`, so the same page is shown in three brands: orrery light, orrery dark and solar;
- renders your default export as the whole page, with no wrapper, background or padding of its own.

The page must follow whichever brand is active.
