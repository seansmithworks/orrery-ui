import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  PANELS,
  openSpecimen,
  panel,
  violations,
  focusRing,
  expectRing,
} from "./kit-test";

/**
 * select.kit.spec.ts: the Select block on the specimen page, once per brand panel.
 * The live select is the one in the "rest" cell; its popup portals into a node in that cell.
 * The "open" and "groups" cells are held-open pictures inside their own frames (.spec-select-frame),
 * which are inert, so nothing here interacts with them. Every wait is on state, never on time.
 */

const FRAME_POPUP = ".spec-select-frame .orr-select__popup";

test.beforeEach(async ({ page }) => {
  await openSpecimen(page);
  // This block's own wait: the six held-open popups (two per panel) have faded in.
  await page.waitForFunction((sel) => {
    const popups = [...document.querySelectorAll(sel)];
    return (
      popups.length === 6 &&
      popups.every((p) => getComputedStyle(p).opacity === "1")
    );
  }, FRAME_POPUP);
});

const block = (page: Page, id: string) =>
  panel(page, id).locator('[data-block="Select"]');
const cell = (page: Page, id: string, name: string) =>
  block(page, id).locator(`[data-cell="${name}"]`);
const triggerIn = (c: Locator) => c.getByRole("combobox", { name: "Orbit" });
const listIn = (c: Locator) => c.getByRole("listbox");

/** The live select: its cell, trigger and list. */
function live(page: Page, id: string) {
  const c = cell(page, id, "rest");
  return { cell: c, trigger: triggerIn(c), list: listIn(c) };
}

/** Waits until the open popup has finished fading in. */
async function settledOpen(list: Locator) {
  await expect(list).toBeVisible();
  await list.evaluate(
    (l) =>
      new Promise<void>((resolve) => {
        const popup = l.closest(".orr-select__popup")!;
        const tick = () =>
          getComputedStyle(popup).opacity === "1" &&
          popup.getAnimations().length === 0
            ? resolve()
            : requestAnimationFrame(tick);
        tick();
      }),
  );
}

const highlighted = (list: Locator) =>
  list.locator('[role="option"][data-highlighted]');

for (const id of PANELS) {
  test.describe(`panel ${id}: Select`, () => {
    test("trigger: a combobox named by the field label, collapsed, described by the field description", async ({
      page,
    }) => {
      const { trigger } = live(page, id);
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
      await expect(trigger).toHaveAccessibleDescription(
        "The chart follows it.",
      );
      await expect(trigger).toHaveText("Kepler");
    });

    test("opens on a click; aria-expanded follows", async ({ page }) => {
      const { trigger, list } = live(page, id);
      await trigger.click();
      await settledOpen(list);
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(list).toBeHidden();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    for (const key of ["Enter", "Space", "ArrowDown"]) {
      test(`opens on ${key} from the focused trigger`, async ({ page }) => {
        const { trigger, list } = live(page, id);
        await trigger.focus();
        await page.keyboard.press(key);
        await settledOpen(list);
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
      });
    }

    test("arrow keys move the highlight; typing jumps to a match; Enter selects, closes and returns focus", async ({
      page,
    }) => {
      const { trigger, list } = live(page, id);
      await trigger.focus();
      await page.keyboard.press("ArrowDown");
      await settledOpen(list);
      // The list opens on the selected item.
      await expect(highlighted(list)).toHaveText("Kepler");
      await page.keyboard.press("ArrowDown");
      await expect(highlighted(list)).toHaveText("Vesta");
      await page.keyboard.press("ArrowDown");
      await expect(highlighted(list)).toHaveText("Ceres");
      await page.keyboard.press("ArrowUp");
      await expect(highlighted(list)).toHaveText("Vesta");
      // Typeahead: "c" jumps to Ceres.
      await page.keyboard.type("c");
      await expect(highlighted(list)).toHaveText("Ceres");
      await page.keyboard.press("Enter");
      await expect(list).toBeHidden();
      await expect(trigger).toHaveText("Ceres");
      await expect(trigger).toBeFocused();
    });

    test("Escape closes without selecting and returns focus to the trigger", async ({
      page,
    }) => {
      const { trigger, list } = live(page, id);
      await trigger.focus();
      await page.keyboard.press("ArrowDown");
      await settledOpen(list);
      await page.keyboard.press("ArrowDown");
      await expect(highlighted(list)).toHaveText("Vesta");
      await page.keyboard.press("Escape");
      await expect(list).toBeHidden();
      await expect(trigger).toHaveText("Kepler");
      await expect(trigger).toBeFocused();
    });

    test("an outside press closes it", async ({ page }) => {
      const { trigger, list } = live(page, id);
      await trigger.click();
      await settledOpen(list);
      await page.mouse.click(4, 4);
      await expect(list).toBeHidden();
      await expect(trigger).toHaveText("Kepler");
    });

    test("disabled: not focusable, does not open on a press", async ({
      page,
    }) => {
      const c = cell(page, id, "disabled");
      const trigger = triggerIn(c);
      await expect(trigger).toBeDisabled();
      await trigger.click({ force: true });
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(c.locator(".orr-select__popup")).toHaveCount(0);
    });

    test("the selected item is exposed to assistive tech", async ({ page }) => {
      const { trigger, list } = live(page, id);
      await trigger.click();
      await settledOpen(list);
      await expect(
        list.getByRole("option", { name: "Kepler", selected: true }),
      ).toHaveCount(1);
      await expect(list.getByRole("option", { selected: true })).toHaveCount(1);
      await expect(
        list.getByRole("option", { name: "Pallas" }),
      ).toHaveAttribute("aria-disabled", "true");
    });

    test("invalid: aria-invalid on the trigger, the error joined to its description", async ({
      page,
    }) => {
      const trigger = triggerIn(cell(page, id, "invalid"));
      await expect(trigger).toHaveAttribute("aria-invalid", "true");
      await expect(trigger).toHaveAccessibleDescription(/Choose an orbit\./);
      await expect(triggerIn(cell(page, id, "rest"))).not.toHaveAttribute(
        "aria-invalid",
        /.*/,
      );
    });

    test("hit area: the trigger and every item are at least 44px on each axis", async ({
      page,
    }) => {
      const { cell: c, trigger, list } = live(page, id);
      const small = (els: Element[]) =>
        els
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { text: el.textContent, w: r.width, h: r.height };
          })
          .filter((r) => r.w < 44 || r.h < 44);
      expect(
        await block(page, id).locator(".orr-select").evaluateAll(small),
      ).toEqual([]);
      await trigger.click();
      await settledOpen(list);
      const items = c.locator(".orr-select__item");
      expect(await items.count()).toBeGreaterThan(0);
      expect(await items.evaluateAll(small)).toEqual([]);
    });

    test("the popup renders inside the container it was given", async ({
      page,
    }) => {
      const { cell: c, trigger, list } = live(page, id);
      await trigger.click();
      await settledOpen(list);
      expect(
        await list.evaluate((l) => {
          const portal = l.closest("[data-base-ui-portal]");
          return {
            parent: portal?.parentElement?.className,
            inCell: !!l.closest('[data-cell="rest"]'),
          };
        }),
      ).toEqual({ parent: "spec-select-portal", inCell: true });
      await expect(c.locator(".spec-select-portal [role=listbox]")).toHaveCount(
        1,
      );
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

    test("axe: no violations, closed", async ({ page }) => {
      expect(await violations(page, id)).toEqual([]);
    });

    test("axe: no violations, open", async ({ page }) => {
      const { trigger, list } = live(page, id);
      await trigger.click();
      await settledOpen(list);
      expect(await violations(page, id)).toEqual([]);
    });
  });
}

test.describe("reduced motion", () => {
  for (const [pref, transform] of [
    ["reduce", false],
    ["no-preference", true],
  ] as const) {
    test(`${pref}: the popup's transition ${transform ? "includes" : "has no"} transform`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: pref });
      const { trigger, list } = live(page, "orrery-light");
      await trigger.click();
      await settledOpen(list);
      const property = await list.evaluate(
        (l) =>
          getComputedStyle(l.closest(".orr-select__popup")!).transitionProperty,
      );
      expect(property.includes("transform")).toBe(transform);
      expect(property).toContain("opacity");
    });
  }
});
