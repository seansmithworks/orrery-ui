import { createRoot } from "react-dom/client";
import { Iris } from "../../src/index";
import type { ButtonSize, TriggerShape } from "../../src/shape";

// Bare fixture for role-fallbacks.spec.ts: Iris with none of its public
// --orrery-iris-* variables set. Query params pick the variant:
//   (none)                 no token CSS, light
//   ?tokens=1              also loads tokens/generated/css/orrery.css
//   ?tokens=1&theme=dark   ... and sets data-theme="dark" the way orrery.css
//                          expects.
//   ?roles=wrong           no token CSS, but the page defines the unprefixed
//                          role names (--page, --text, ...) with deliberately
//                          wrong values: the name-collision case.
//   ?shape=<shape>         the bare root's real `shape` prop (rounded-square,
//                          square, squircle, rectangle); ?buttonSize=s|m|l.
// The page never sets a --orrery-iris-* variable. Sheet and preview content
// are fixed-size empty blocks, so no measurement depends on text metrics.

const params = new URLSearchParams(location.search);
const shape = (params.get("shape") ?? undefined) as TriggerShape | undefined;
const buttonSize = (params.get("buttonSize") ?? undefined) as
  ButtonSize | undefined;

const WRONG_ROLES = `:root {
  --page: #ff00ff; --layer-1: #ff00ff; --layer-2: #ff00ff;
  --line: #ff00ff; --line-strong: #ff00ff; --line-dashed: #ff00ff;
  --text: #00ff00; --text-muted: #00ff00; --accent: #ff00ff; --on-accent: #00ff00;
  --shadow-lift: 0 0 0 7px #ff00ff;
  --line-width: 7px; --radius-round: 7px;
  --space-4: 7px; --space-8: 7px; --space-12: 7px; --space-16: 7px;
  --space-20: 7px; --space-24: 7px; --space-32: 7px; --space-40: 7px;
  --space-48: 7px; --space-72: 7px;
}`;

async function boot() {
  if (params.get("tokens") === "1") {
    await import("../../tokens/generated/css/orrery.css");
    const theme = params.get("theme");
    if (theme) document.documentElement.dataset.theme = theme;
  }
  if (params.get("roles") === "wrong") {
    const style = document.createElement("style");
    style.textContent = WRONG_ROLES;
    document.head.appendChild(style);
  }
  createRoot(document.getElementById("root")!).render(<App />);
}

function App() {
  return (
    <>
      <Iris.Root
        id="bare"
        defaultAnchor="bottom-right"
        persistKey={false}
        shape={shape}
        buttonSize={buttonSize}
      >
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
