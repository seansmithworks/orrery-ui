// Lane-2 host page, the same for every condition. It sets data-brand and data-theme on <html>, loads brand.css
// (and the condition's own stylesheet, passed as ?css=), then mounts the solution's default export as the whole
// page: no wrapper, no background, no padding. Painting the page in the brand is the solution's job (or its library's).
import { StrictMode, createElement, type ComponentType } from "react";
import { createRoot } from "react-dom/client";

const BRANDS: Record<string, [string, string]> = {
  "orrery-light": ["orrery", "light"],
  "orrery-dark": ["orrery", "dark"],
  solar: ["solar", "dark"],
};

export async function mount() {
  const params = new URLSearchParams(location.search);
  const [brand, theme] = BRANDS[params.get("brand") ?? "orrery-light"];
  document.documentElement.dataset.brand = brand;
  document.documentElement.dataset.theme = theme;
  try {
    for (const css of params.getAll("css"))
      await import(/* @vite-ignore */ `/@fs${css}`);
    const mod = (await import(
      /* @vite-ignore */ `/@fs${params.get("file")}`
    )) as { default: ComponentType };
    createRoot(document.getElementById("root")!).render(
      <StrictMode>{createElement(mod.default)}</StrictMode>,
    );
  } catch (error) {
    document.body.dataset.loadError = String(error);
  }
}
