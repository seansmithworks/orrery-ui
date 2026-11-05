// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Iris } from "./index";

describe("Root id handling", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver =
      class ResizeObserver {
        observe() {}
        disconnect() {}
      };
  });

  afterEach(() => {
    container.remove();
  });

  const tree = (id?: string) => (
    <Iris.Root id={id}>
      <Iris.Trigger>t</Iris.Trigger>
    </Iris.Root>
  );

  it("keeps hook order when id goes from absent to provided", async () => {
    const root = createRoot(container);
    await act(async () => root.render(tree()));
    await act(async () => root.render(tree("x")));
    await act(async () => root.unmount());
  });

  it("escapes quotes in a consumer id inside the scoped size rule", async () => {
    const root = createRoot(container);
    await act(async () => root.render(tree('a"b]c')));
    const css = Array.from(container.querySelectorAll("style"))
      .map((s) => s.textContent ?? "")
      .join("");
    expect(css).toContain("--orrery-iris-trigger-size");
    expect(css).not.toContain('"a"b]c"');
    expect(css).toMatch(/\[data-orrery-iris-root="a\\+"b/);
    await act(async () => root.unmount());
  });
});
