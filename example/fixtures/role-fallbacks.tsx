import { createRoot } from "react-dom/client";
import { Iris } from "../../src/index";

// Bare fixture for role-fallbacks.spec.ts: Iris with none of its public
// --orrery-iris-* variables set. Query params pick the variant:
//   (none)                 no token CSS, light
//   ?tokens=1              also loads tokens/generated/css/orrery.css
//   ?tokens=1&theme=dark   ... and sets data-theme="dark" the way orrery.css
//                          expects.
// Sheet and preview content are fixed-size empty blocks, so no measurement
// depends on text metrics.

const params = new URLSearchParams(location.search);

async function boot() {
  if (params.get("tokens") === "1") {
    await import("../../tokens/generated/css/orrery.css");
    const theme = params.get("theme");
    if (theme) document.documentElement.dataset.theme = theme;
  }
  createRoot(document.getElementById("root")!).render(<App />);
}

function App() {
  return (
    <>
      <Iris.Root id="bare" defaultAnchor="bottom-right" persistKey={false}>
        <Iris.Shadow />
        <Iris.Trigger aria-label="Open bare sheet">
          <Iris.Shared />
        </Iris.Trigger>
        <Iris.Sheet aria-label="Bare sheet">
          <Iris.Shared />
          <Iris.Close aria-label="Close" />
          <Iris.Content>
            <Iris.Item>
              <div style={{ height: 120 }} />
            </Iris.Item>
          </Iris.Content>
        </Iris.Sheet>
      </Iris.Root>

      <Iris.Root id="preview" preview>
        <Iris.Shadow />
        <Iris.Trigger asChild>
          <a
            href="#preview"
            aria-label="Preview link"
            style={{
              position: "fixed",
              left: 40,
              top: 40,
              display: "block",
              width: 80,
              height: 24,
            }}
          />
        </Iris.Trigger>
        <Iris.Sheet aria-label="Bare preview" aspectRatio={360 / 520}>
          <Iris.Content>
            <div style={{ height: 120 }} />
          </Iris.Content>
        </Iris.Sheet>
      </Iris.Root>
    </>
  );
}

void boot();
