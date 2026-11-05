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

  it("escapes a consumer id as a CSS string and still matches the attribute", async () => {
    const id = 'a"b\\c:d';
    const root = createRoot(container);
    await act(async () => root.render(tree(id)));
    const css = Array.from(container.querySelectorAll("style"))
      .map((s) => s.textContent ?? "")
      .join("");
    // `"` and `\` escaped, `:` left alone.
    expect(css).toContain('[data-orrery-iris-root="a\\"b\\\\c:d"]{');
    // The CSS string unescapes back to the exact attribute value.
    const el = container.querySelector("[data-orrery-iris-root]");
    expect(el?.getAttribute("data-orrery-iris-root")).toBe(id);
    expect(container.querySelector('[data-orrery-iris-root="a\\"b\\\\c:d"]')).toBe(el);
    await act(async () => root.unmount());
  });
});
