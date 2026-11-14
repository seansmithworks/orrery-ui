// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IconButtonProps } from "./Button";

// React's act() needs this flag outside a test renderer.
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
beforeEach(() => {
  vi.resetModules(); // a fresh module, so the warn-once flag starts clear in each test
  host = document.createElement("div");
  document.body.append(host);
});
afterEach(() => {
  host.remove();
  vi.restoreAllMocks();
});

async function render(props: Record<string, unknown>) {
  const { IconButton } = await import("./Button");
  const root = createRoot(host);
  act(() =>
    root.render(<IconButton {...(props as IconButtonProps)}>+</IconButton>),
  );
  return root;
}

describe("IconButton accessible name warning (development only)", () => {
  it("warns once when there is no aria-label or aria-labelledby", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const root = await render({});
    act(() => root.render(<span />));
    const { IconButton } = await import("./Button");
    act(() =>
      root.render(<IconButton {...({} as IconButtonProps)}>+</IconButton>),
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/IconButton has no accessible name/);
  });

  it("warns when the name is empty or only spaces", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await render({ "aria-label": "  " });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("is silent with an aria-label or aria-labelledby", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const root = await render({ "aria-label": "Add orbit" });
    const { IconButton } = await import("./Button");
    act(() => root.render(<IconButton aria-labelledby="x">+</IconButton>));
    expect(warn).not.toHaveBeenCalled();
  });

  it("is silent in production", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    try {
      await render({});
    } finally {
      vi.unstubAllEnvs();
    }
    expect(warn).not.toHaveBeenCalled();
  });
});
