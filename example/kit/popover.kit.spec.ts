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
import { patternProblems, transitionsOff } from "./check-pattern";

/**
 * popover.kit.spec.ts: the Popover block on the specimen page, once per brand panel.
 * The live popover is the one in the "rest" cell; its panel renders in place, in the top layer.
 * The "open" and "open compact" cells are held-open pictures inside their own frames
 * (.spec-popover-frame), which are inert, so nothing here interacts with them. Every wait is on
 * state, never on time.
 */

test.beforeEach(async ({ page }) => {
  await openSpecimen(page);
  // This block's own wait: the six held-open panels (two per panel) have faded in.
  await page.waitForFunction(heldPopupsShown, {
    frame: ".spec-popover-frame",
    popup: ".orr-popover",
    count: 6,
  });
});

const block = (page: Page, id: string) =>
  panel(page, id).locator('[data-block="Popover"]');
const cell = (page: Page, id: string, name: string) =>
  block(page, id).locator(`[data-cell="${name}"]`);

/** The live popover: its cell, trigger and open panel. */
function live(page: Page, id: string) {
  const c = cell(page, id, "rest");
  return {
    cell: c,
    trigger: c.getByRole("button", { name: "Share" }),
    popup: c.getByRole("dialog", { name: "Share this chart" }),
  };
}

/** Waits until the open panel has finished fading in. */
async function settledOpen(popup: Locator) {
  await expect(popup).toBeVisible();
  await popup.evaluate(
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

for (const id of PANELS) {
  test.describe(`panel ${id}: Popover`, () => {
    test("trigger: a button that announces a dialog, collapsed", async ({
      page,
    }) => {
      const { trigger } = live(page, id);
      await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    test("opens on a click: a non-modal dialog named by its title and described by its text, focus moved in", async ({
      page,
    }) => {
      const { trigger, popup } = live(page, id);
      await trigger.click();
      await settledOpen(popup);
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(popup).toHaveAccessibleDescription(
        "Anyone with the link can view it. They cannot edit it.",
      );
      await expect(popup).not.toHaveAttribute("aria-modal", "true");
      await expect(popup.getByRole("button", { name: "Done" })).toBeFocused();
    });

    for (const key of ["Enter", "Space"]) {
      test(`opens on ${key} from the focused trigger`, async ({ page }) => {
        const { trigger, popup } = live(page, id);
        await trigger.focus();
        await page.keyboard.press(key);
        await settledOpen(popup);
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
      });
    }

    test("Escape closes it and returns focus to the trigger", async ({
      page,
    }) => {
      const { trigger, popup } = live(page, id);
      await trigger.click();
      await settledOpen(popup);
      await page.keyboard.press("Escape");
      await expect(popup).toBeHidden();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toBeFocused();
    });

    test("an outside press closes it", async ({ page }) => {
      const { trigger, popup } = live(page, id);
      await trigger.click();
      await settledOpen(popup);
      await page.mouse.click(4, 4);
      await expect(popup).toBeHidden();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    test("Done closes it and returns focus to the trigger", async ({
      page,
    }) => {
      const { trigger, popup } = live(page, id);
      await trigger.click();
      await settledOpen(popup);
      await popup.getByRole("button", { name: "Done" }).click();
      await expect(popup).toBeHidden();
      await expect(trigger).toBeFocused();
    });

    test("the page stays usable while it is open: not modal, nothing inert", async ({
      page,
    }) => {
      const { trigger, popup } = live(page, id);
      await trigger.click();
      await settledOpen(popup);
      expect(
        await page.evaluate(
          () => document.querySelectorAll("[inert]:not(iframe)").length,
        ),
      ).toBe(0);
    });

    test("opens below the trigger, the kit's 4px offset away", async ({
      page,
    }) => {
      const { trigger, popup } = live(page, id);
      await trigger.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await trigger.click();
      await settledOpen(popup);
      await expect(popup).toHaveAttribute("data-side", "bottom");
      const [t, p] = [await rectOf(trigger), await rectOf(popup)];
      expect(p.top - t.bottom).toBeCloseTo(4, 0);
    });

    test("the open panel stays in its cell, under the panel's brand, and is on top at its centre", async ({
      page,
    }) => {
      const { trigger, popup } = live(page, id);
      await trigger.click();
      await settledOpen(popup);
      expect(
        await popup.evaluate((p) => {
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

    test("drawing: the floating level's fill, hairline and radius, Dialog's padding scale", async ({
      page,
    }) => {
      const { trigger, popup } = live(page, id);
      await trigger.click();
      await settledOpen(popup);
      expect(
        await popup.evaluate((p) => {
          const cs = getComputedStyle(p);
          const probe = document.createElement("span");
          probe.style.cssText =
            "background: var(--page); border-color: var(--line-strong); border-radius: var(--radius-panel); padding: var(--space-16); border-style: solid; border-width: var(--line-width)";
          p.append(probe);
          const want = getComputedStyle(probe);
          const got = {
            fill: cs.backgroundColor === want.backgroundColor,
            border: cs.borderTopColor === want.borderTopColor,
            width: cs.borderTopWidth === want.borderTopWidth,
            radius: cs.borderTopLeftRadius === want.borderTopLeftRadius,
            padding: cs.paddingTop === want.paddingTop,
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
        padding: true,
        shadow: "none",
      });
    });

    test("focus ring: --ring-width solid --accent on the keyboard-focused trigger", async ({
      page,
    }) => {
      const { trigger } = live(page, id);
      await trigger.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(trigger).toBeFocused();
      expectRing(await focusRing(page, id));
    });

    test("an open popover has no axe violation", async ({ page }) => {
      const { trigger, popup } = live(page, id);
      await trigger.click();
      await settledOpen(popup);
      expect(await violations(page, id)).toEqual([]);
    });

    test('the open popover passes checkPattern "dialog" (APG dialog, non-modal)', async ({
      page,
    }) => {
      // UI SDK's testing kit has no popover pattern; a popover has the dialog role, and the dialog
      // check holds it to a name, focus moved in, Escape closing, and focus back on the trigger.
      await transitionsOff(page);
      const { trigger, popup } = live(page, id);
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(popup).toBeVisible();
      expect(
        await patternProblems(
          page,
          `[data-panel="${id}"] [data-block="Popover"] [data-cell="rest"]`,
          "dialog",
        ),
      ).toBe("");
    });

    test("right to left: the panel reads right to left and its title starts at the right edge", async ({
      page,
    }) => {
      const { cell: c, trigger, popup } = live(page, id);
      await c.evaluate((el) => el.setAttribute("dir", "rtl"));
      await trigger.click();
      await settledOpen(popup);
      const m = await popup.evaluate((p) => {
        const pr = p.getBoundingClientRect();
        const title = p.querySelector(".orr-popover__title")!;
        const tr = title.getBoundingClientRect();
        return {
          direction: getComputedStyle(p).direction,
          gapStart: pr.right - tr.right,
          gapEnd: tr.left - pr.left,
          padding: parseFloat(getComputedStyle(p).paddingRight),
        };
      });
      expect(m.direction).toBe("rtl");
      // The title is a block as wide as the panel's content: it sits inside the padding on both sides.
      expect(m.gapStart).toBeCloseTo(m.padding + 1, 0);
      expect(m.gapEnd).toBeCloseTo(m.padding + 1, 0);
      const alignment = await popup
        .locator(".orr-popover__title")
        .evaluate((t) => getComputedStyle(t).textAlign);
      expect(["start", "right"]).toContain(alignment);
    });
  });

  test.describe(`panel ${id}: Popover at 400px`, () => {
    test.use({ viewport: { width: 400, height: 900 } });

    test("the panel stays inside the window with its 8px gutter and never overflows sideways", async ({
      page,
    }) => {
      const { trigger, popup } = live(page, id);
      await trigger.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await trigger.click();
      await settledOpen(popup);
      const r = await rectOf(popup);
      expect(r.left).toBeGreaterThanOrEqual(8 - 0.5);
      expect(r.right).toBeLessThanOrEqual(400 - 8 + 0.5);
      expect(await popup.evaluate((p) => p.scrollWidth <= p.clientWidth)).toBe(
        true,
      );
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
  test("Popover example: Share opens a named panel and Done returns focus to Share", async ({
    page,
  }) => {
    await page.goto("/fixtures/kit-examples.html");
    const example = page.locator(
      '[data-example="kit/popover/Popover.example.tsx"]',
    );
    const trigger = example.getByRole("button", { name: "Share" });
    await trigger.click();
    const popup = example.getByRole("dialog", { name: "Share this chart" });
    await expect(popup).toBeVisible();
    await popup.getByRole("button", { name: "Done" }).click();
    await expect(popup).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
