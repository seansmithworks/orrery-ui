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
  // This block's own wait: the nine held-open popups (three per panel) have faded in.
  await page.waitForFunction((sel) => {
    const popups = [...document.querySelectorAll(sel)];
    return (
      popups.length === 9 &&
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

/** The grouped "long list" select: more items than the popup's max height holds. */
function longList(page: Page, id: string) {
  const c = cell(page, id, "long list");
  return {
    cell: c,
    trigger: c.getByRole("combobox", { name: "Moon" }),
    list: listIn(c),
  };
}

/** Puts the trigger at the top of the window, so the popup has room to open below it. */
const toTop = (trigger: Locator) =>
  trigger.evaluate((el) => el.scrollIntoView({ block: "start" }));

/**
 * WCAG contrast ratio of a computed rgb()/rgba() foreground over an opaque background. A translucent
 * foreground (solar's --text-muted is rgba) is composited over the background first.
 */
function contrastInPage([fg, bg]: [string, string]) {
  const parse = (c: string) => {
    const [r, g, b, a = 1] = (c.match(/[\d.]+/g) ?? []).map(Number);
    return { r, g, b, a };
  };
  const back = parse(bg);
  const front = parse(fg);
  const mix = (k: "r" | "g" | "b") =>
    front[k] * front.a + back[k] * (1 - front.a);
  const lum = (r: number, g: number, b: number) => {
    const lin = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const [hi, lo] = [
    lum(mix("r"), mix("g"), mix("b")),
    lum(back.r, back.g, back.b),
  ].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

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

    test("highlight: the highlighted item's fill is at least 3:1 against the popup fill; the selected check is --text on the popup fill", async ({
      page,
    }) => {
      const { trigger, list } = live(page, id);
      await trigger.focus();
      await page.keyboard.press("ArrowDown");
      await settledOpen(list);
      await page.keyboard.press("ArrowDown");
      await expect(highlighted(list)).toHaveText("Vesta");
      const colours = await list.evaluate((l) => {
        const popup = l.closest(".orr-select__popup")!;
        const item = l.querySelector("[data-highlighted]")!;
        const check = l.querySelector(
          "[data-selected]:not([data-highlighted]) .orr-select__check",
        )!;
        const probe = document.createElement("span");
        probe.style.color = "var(--text)";
        popup.append(probe);
        const text = getComputedStyle(probe).color;
        probe.remove();
        return {
          popupFill: getComputedStyle(popup).backgroundColor,
          highlightFill: getComputedStyle(item).backgroundColor,
          highlightText: getComputedStyle(item).color,
          check: getComputedStyle(check).color,
          text,
        };
      });
      const fill = contrastInPage([colours.highlightFill, colours.popupFill]);
      const label = contrastInPage([
        colours.highlightText,
        colours.highlightFill,
      ]);
      test.info().annotations.push({
        type: "contrast",
        description: `${id}: highlight fill vs popup fill ${fill.toFixed(2)}:1, text on highlight ${label.toFixed(2)}:1`,
      });
      console.log(
        `contrast ${id}: highlight fill vs popup fill ${fill.toFixed(2)}:1, text on highlight ${label.toFixed(2)}:1`,
      );
      expect(fill).toBeGreaterThanOrEqual(3);
      expect(label).toBeGreaterThanOrEqual(4.5);
      // Selected but not highlighted: a --text check on the popup fill.
      expect(colours.check).toBe(colours.text);
    });

    test("disabled item highlighted: popup fill, readable muted text, a visible inset ring; Enter neither selects nor closes", async ({
      page,
    }) => {
      const { trigger, list } = live(page, id);
      await trigger.focus();
      await page.keyboard.press("ArrowDown");
      await settledOpen(list);
      for (const name of ["Vesta", "Ceres", "Pallas"]) {
        await page.keyboard.press("ArrowDown");
        await expect(highlighted(list)).toHaveText(name);
      }
      const c = await list.evaluate((l) => {
        const popup = l.closest(".orr-select__popup")!;
        const item = l.querySelector("[data-highlighted]")!;
        const cs = getComputedStyle(item);
        return {
          disabled: item.hasAttribute("data-disabled"),
          popupFill: getComputedStyle(popup).backgroundColor,
          fill: cs.backgroundColor,
          text: cs.color,
          ring: cs.boxShadow.match(/rgba?\([^)]*\)/)?.[0] ?? "none",
          inset: cs.boxShadow.includes("inset"),
        };
      });
      expect(c.disabled).toBe(true);
      expect(c.fill).toBe(c.popupFill);
      expect(c.inset).toBe(true);
      const text = contrastInPage([c.text, c.fill]);
      const ring = contrastInPage([c.ring, c.fill]);
      console.log(
        `contrast ${id}: disabled highlighted text vs fill ${text.toFixed(2)}:1, ring vs fill ${ring.toFixed(2)}:1`,
      );
      expect(text).toBeGreaterThanOrEqual(4.5);
      expect(ring).toBeGreaterThanOrEqual(3);
      await page.keyboard.press("Enter");
      await expect(list).toBeVisible();
      await expect(highlighted(list)).toHaveText("Pallas");
      await expect(
        list.getByRole("option", { name: "Pallas" }),
      ).toHaveAttribute("aria-selected", "false");
      await expect(trigger).toHaveText("Kepler");
    });

    test("placement: opens below the trigger at the kit's offset; a long list is clamped to the kit's max height and scrolls", async ({
      page,
    }) => {
      const { trigger, list } = longList(page, id);
      await toTop(trigger);
      await trigger.click();
      await settledOpen(list);
      const m = await list.evaluate((l) => {
        const popup = l.closest(".orr-select__popup") as HTMLElement;
        const positioner = popup.parentElement as HTMLElement;
        const button = document.querySelector(
          `[aria-controls="${l.id}"]`,
        ) as HTMLElement;
        const pcs = getComputedStyle(positioner);
        const before = l.scrollTop;
        l.scrollTop = l.scrollHeight;
        return {
          side: popup.getAttribute("data-side"),
          gap:
            popup.getBoundingClientRect().top -
            button.getBoundingClientRect().bottom,
          offset: parseFloat(pcs.getPropertyValue("--orr-select-offset")),
          height: popup.getBoundingClientRect().height,
          maxHeight: parseFloat(getComputedStyle(popup).maxHeight),
          // The property is a calc(), so resolve it through a probe's height.
          kitMax: (() => {
            const probe = document.createElement("div");
            probe.style.height = "var(--orr-select-max-height)";
            positioner.append(probe);
            const h = parseFloat(getComputedStyle(probe).height);
            probe.remove();
            return h;
          })(),
          overflows: l.scrollHeight > l.clientHeight,
          scrolled: l.scrollTop > before,
        };
      });
      expect(m.side).toBe("bottom");
      expect(m.offset).toBeGreaterThan(0);
      expect(Math.abs(m.gap - m.offset)).toBeLessThan(0.5);
      expect(m.maxHeight).toBe(m.kitMax);
      expect(Math.abs(m.height - m.kitMax)).toBeLessThan(0.5);
      expect(m.overflows).toBe(true);
      expect(m.scrolled).toBe(true);
    });

    test("axe: no violations, a live grouped list with separators open", async ({
      page,
    }) => {
      const { trigger, list } = longList(page, id);
      await trigger.click();
      await settledOpen(list);
      await expect(list.getByRole("group")).toHaveCount(4);
      // Base UI renders a select's separator as role="presentation" inside the listbox.
      await expect(list.locator(".orr-select__separator")).toHaveCount(3);
      expect(await violations(page, id)).toEqual([]);
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

test.describe("golden example (fixtures/kit-examples.html)", () => {
  test("Select example: submitting empty shows valueMissing and does not submit; choosing a value submits body=<value>", async ({
    page,
  }) => {
    await page.goto("/fixtures/kit-examples.html");
    const example = page.locator(
      '[data-example="kit/select/Select.example.tsx"]',
    );
    const trigger = example.getByRole("combobox", { name: "Body" });
    const status = example.getByRole("status");
    const submit = example.getByRole("button", { name: "Make chart" });

    await submit.click();
    const error = example.getByText("Choose a body for the chart to follow.");
    await expect(error).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-invalid", "true");
    await expect(trigger).toHaveAccessibleDescription(/Choose a body/);
    await expect(trigger).toBeFocused();
    await expect(status).toHaveText("");

    await trigger.click();
    // The example's popup portals to <body>, outside the example's section.
    await page.getByRole("option", { name: "Saturn" }).click();
    await expect(trigger).toHaveText("Saturn");
    await submit.click();
    // The status reads the submitted form values: body=saturn, shown as its label.
    await expect(status).toHaveText("Chart made for Saturn.");
    await expect(error).toBeHidden();
    await expect(trigger).not.toHaveAttribute("aria-invalid", "true");
  });
});
