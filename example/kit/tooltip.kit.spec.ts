import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  PANELS,
  openSpecimen,
  heldPopupsShown,
  panel,
  violations,
  focusRing,
  expectRing,
} from "./kit-test";

/**
 * tooltip.kit.spec.ts: the Tooltip block on the specimen page, once per brand panel.
 * The live tooltips are the two in the "rest" cell: an icon button named by its tooltip
 * (type="label") and a text button described by its tooltip. They render in place, hidden until
 * shown, in the top layer. The "open below" and "open above" cells are held-open pictures inside
 * their own frames (.spec-tooltip-frame), which are inert. Every wait is on state, never on time.
 *
 * UI SDK's checkPattern has no tooltip pattern (its list is listbox, menu, menubar, tabs,
 * radio-group, toolbar, tree, dialog, alertdialog, disclosure, accordion, combobox, slider, switch,
 * checkbox), and none of them fits a label that cannot take focus, so the WAI-ARIA tooltip
 * contract is asserted directly below: the tooltip role, the name or description wiring, hover and
 * keyboard focus open it, Escape dismisses it, and it holds nothing focusable.
 */

test.beforeEach(async ({ page }) => {
  await openSpecimen(page);
  // This block's own wait: the six held-open labels (two per panel) have faded in.
  await page.waitForFunction(heldPopupsShown, {
    frame: ".spec-tooltip-frame",
    popup: ".orr-tooltip",
    count: 6,
  });
});

const block = (page: Page, id: string) =>
  panel(page, id).locator('[data-block="Tooltip"]');
const cell = (page: Page, id: string, name: string) =>
  block(page, id).locator(`[data-cell="${name}"]`);

/** The two live tooltips: each trigger and its label (a hidden element until shown). */
function live(page: Page, id: string) {
  const c = cell(page, id, "rest");
  return {
    cell: c,
    icon: c.getByRole("button", { name: "Save chart" }),
    iconTip: c.locator(".orr-tooltip", { hasText: "Save chart" }),
    text: c.getByRole("button", { name: "Export" }),
    textTip: c.locator(".orr-tooltip", { hasText: "Downloads the chart" }),
  };
}

/** Waits until the label has finished fading in. */
async function settledOpen(tip: Locator) {
  await expect(tip).toBeVisible();
  await tip.evaluate(
    (p) =>
      new Promise<void>((resolve) => {
        const tick = () =>
          getComputedStyle(p).opacity === "1" && p.getAnimations().length === 0
            ? resolve()
            : requestAnimationFrame(tick);
        tick();
      }),
  );
}

const rectOf = (el: Locator) =>
  el.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  });

/** A real pointer on the element's centre: the tooltip opens after UI SDK's rest delay. */
async function hover(page: Page, el: Locator) {
  await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const r = await rectOf(el);
  await page.mouse.move((r.left + r.right) / 2, (r.top + r.bottom) / 2);
}

for (const id of PANELS) {
  test.describe(`panel ${id}: Tooltip`, () => {
    test("the tooltip is in the page from the start, hidden, with the tooltip role", async ({
      page,
    }) => {
      const { iconTip, textTip } = live(page, id);
      await expect(iconTip).toHaveAttribute("role", "tooltip");
      await expect(textTip).toHaveAttribute("role", "tooltip");
      await expect(iconTip).toBeHidden();
      await expect(textTip).toBeHidden();
    });

    test("an icon-only trigger is named by its tooltip; a text trigger is described by it", async ({
      page,
    }) => {
      const { icon, text } = live(page, id);
      await expect(icon).toHaveAccessibleName("Save chart");
      await expect(text).toHaveAccessibleName("Export");
      await expect(text).toHaveAccessibleDescription(
        "Downloads the chart as an SVG file.",
      );
    });

    test("opens when the pointer rests on the trigger, and closes when it leaves", async ({
      page,
    }) => {
      const { text, textTip } = live(page, id);
      await hover(page, text);
      await settledOpen(textTip);
      await page.mouse.move(2, 2);
      await expect(textTip).toBeHidden();
    });

    test("opens when keyboard focus reaches the trigger; Escape closes it and focus stays on the trigger", async ({
      page,
    }) => {
      const { icon, iconTip } = live(page, id);
      await icon.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(icon).toBeFocused();
      await settledOpen(iconTip);
      await page.keyboard.press("Escape");
      await expect(iconTip).toBeHidden();
      await expect(icon).toBeFocused();
    });

    test("it holds only text: nothing in it can take focus, and Tab goes past it", async ({
      page,
    }) => {
      const { text, textTip } = live(page, id);
      await text.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await settledOpen(textTip);
      expect(
        await textTip.evaluate(
          (t) =>
            t.querySelectorAll(
              "a[href], button, input, select, textarea, [tabindex]",
            ).length,
        ),
      ).toBe(0);
      expect(await textTip.evaluate((t) => t.tabIndex)).toBe(-1);
      await page.keyboard.press("Tab");
      expect(
        await textTip.evaluate((t) => t.contains(document.activeElement)),
      ).toBe(false);
    });

    test("opens above the trigger, centred on it, the kit's 4px offset away", async ({
      page,
    }) => {
      const { text, textTip } = live(page, id);
      await hover(page, text);
      await settledOpen(textTip);
      await expect(textTip).toHaveAttribute("data-side", "top");
      const [t, p] = [await rectOf(text), await rectOf(textTip)];
      expect(t.top - p.bottom).toBeCloseTo(4, 0);
      expect((t.left + t.right) / 2).toBeCloseTo((p.left + p.right) / 2, 0);
    });

    test("the open label stays in its cell, under the panel's brand, and is on top at its centre", async ({
      page,
    }) => {
      const { text, textTip } = live(page, id);
      await hover(page, text);
      await settledOpen(textTip);
      expect(
        await textTip.evaluate((p) => {
          const r = p.getBoundingClientRect();
          return {
            inCell: !!p.closest('[data-cell="rest"]'),
            panel: p.closest("[data-brand]")?.getAttribute("data-panel"),
            onTop: p.contains(
              document.elementFromPoint(
                r.left + r.width / 2,
                r.top + r.height / 2,
              ),
            ),
          };
        }),
      ).toEqual({ inCell: true, panel: id, onTop: true });
    });

    test("drawing: the floating level's fill and hairline at the control radius, small type", async ({
      page,
    }) => {
      const { text, textTip } = live(page, id);
      await hover(page, text);
      await settledOpen(textTip);
      expect(
        await textTip.evaluate((p) => {
          const cs = getComputedStyle(p);
          const probe = document.createElement("span");
          probe.style.cssText =
            "background: var(--page); border-color: var(--line-strong); border-radius: var(--radius-control); font-size: var(--type-size-13); border-style: solid; border-width: var(--line-width)";
          p.append(probe);
          const want = getComputedStyle(probe);
          const got = {
            fill: cs.backgroundColor === want.backgroundColor,
            border: cs.borderTopColor === want.borderTopColor,
            width: cs.borderTopWidth === want.borderTopWidth,
            radius: cs.borderTopLeftRadius === want.borderTopLeftRadius,
            size: cs.fontSize === want.fontSize,
            shadow: cs.boxShadow,
          };
          probe.remove();
          return got;
        }),
      ).toEqual({
        fill: true,
        border: true,
        width: true,
        radius: true,
        size: true,
        shadow: "none",
      });
    });

    test("focus ring: --ring-width solid --accent on the keyboard-focused trigger", async ({
      page,
    }) => {
      const { text } = live(page, id);
      await text.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(text).toBeFocused();
      expectRing(await focusRing(page, id));
    });

    test("an open tooltip has no axe violation", async ({ page }) => {
      const { text, textTip } = live(page, id);
      await hover(page, text);
      await settledOpen(textTip);
      expect(await violations(page, id)).toEqual([]);
    });

    test("right to left: the label reads right to left and stays centred on its trigger", async ({
      page,
    }) => {
      const { cell: c, text, textTip } = live(page, id);
      await c.evaluate((el) => el.setAttribute("dir", "rtl"));
      await hover(page, text);
      await settledOpen(textTip);
      expect(await textTip.evaluate((p) => getComputedStyle(p).direction)).toBe(
        "rtl",
      );
      const [t, p] = [await rectOf(text), await rectOf(textTip)];
      expect((t.left + t.right) / 2).toBeCloseTo((p.left + p.right) / 2, 0);
    });
  });

  test.describe(`panel ${id}: Tooltip at 400px`, () => {
    test.use({ viewport: { width: 400, height: 900 } });

    test("the label stays inside the window with its 8px gutter and wraps instead of overflowing", async ({
      page,
    }) => {
      const { text, textTip } = live(page, id);
      await hover(page, text);
      await settledOpen(textTip);
      const r = await rectOf(textTip);
      expect(r.left).toBeGreaterThanOrEqual(8 - 0.5);
      expect(r.right).toBeLessThanOrEqual(400 - 8 + 0.5);
      expect(
        await textTip.evaluate((p) => p.scrollWidth <= p.clientWidth),
      ).toBe(true);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    });
  });
}

test.describe("golden example (fixtures/kit-examples.html)", () => {
  test("Tooltip example: the icon button is named by its tooltip and Export is described by its", async ({
    page,
  }) => {
    await page.goto("/fixtures/kit-examples.html");
    const example = page.locator(
      '[data-example="kit/tooltip/Tooltip.example.tsx"]',
    );
    await expect(
      example.getByRole("button", { name: "Save chart" }),
    ).toHaveCount(1);
    await expect(
      example.getByRole("button", { name: "Export" }),
    ).toHaveAccessibleDescription("Downloads the chart as an SVG file.");
  });
});
