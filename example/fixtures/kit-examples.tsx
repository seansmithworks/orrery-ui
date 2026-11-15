// Fixture for example/kit.spec.ts: every kit golden example (kit/**/*.example.tsx), each mounted in its own section.
// Tokens come from the specimen's brand setup (example/kit/scope.ts); <html data-brand="orrery"> picks brand orrery, light.
import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import "../../kit/kit.css";
import { installBrandTokens } from "../kit/scope";

// Vite's import.meta.glob (the example has no vite/client types).
declare global {
  interface ImportMeta {
    glob<T>(pattern: string, options: { eager: true }): Record<string, T>;
  }
}

installBrandTokens();

const examples = import.meta.glob<{ default: ComponentType }>(
  "../../kit/**/*.example.tsx",
  { eager: true },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-48)",
        padding: "var(--space-32)",
        background: "var(--page)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <h1 style={{ margin: 0 }}>Kit golden examples</h1>
      {Object.entries(examples).map(([file, mod]) => {
        const Example = mod.default;
        const name = file.replace("../../", "");
        return (
          <section key={file} data-example={name} aria-label={name}>
            <Example />
          </section>
        );
      })}
    </main>
  </StrictMode>,
);
