// Eval render page: mounts one scored solution (?file=<absolute path>) under one brand (?brand=orrery-light|orrery-dark|solar).
// Brand and mode come from the same generated token CSS the kit specimen uses (example/kit/scope.ts).
import { StrictMode, createElement, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import "../../kit/kit.css";
// Imported for its dependencies: Vite's startup scan then pre-bundles everything the kit needs before any solution loads.
import "../../kit/index";
import { installBrandTokens } from "../../example/kit/scope";

const BRANDS: Record<string, { brand: string; theme: string }> = {
  "orrery-light": { brand: "orrery", theme: "light" },
  "orrery-dark": { brand: "orrery", theme: "dark" },
  solar: { brand: "solar", theme: "dark" },
};

const params = new URLSearchParams(location.search);
const { brand, theme } = BRANDS[params.get("brand") ?? "orrery-light"];
document.documentElement.dataset.brand = brand;
document.documentElement.dataset.theme = theme;
installBrandTokens();

// Dynamic import by absolute path (Vite's /@fs/ prefix): a glob would miss solutions written after the server started.
(
  import(/* @vite-ignore */ `/@fs${params.get("file")}`) as Promise<{
    default: ComponentType;
  }>
).then(
  (mod) => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <main
          style={{
            padding: "var(--space-32)",
            background: "var(--page)",
            color: "var(--text)",
            fontFamily: "var(--font-sans)",
            minHeight: "100vh",
          }}
        >
          {createElement(mod.default)}
        </main>
      </StrictMode>,
    );
  },
  (error) => {
    document.body.dataset.loadError = String(error);
  },
);
