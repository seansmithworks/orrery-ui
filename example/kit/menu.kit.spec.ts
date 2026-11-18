import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  PANELS,
  openSpecimen,
  heldPopupsShown,
  panel,
  violations,
} from "./kit-test";
import { patternProblems, transitionsOff } from "./check-pattern";

/**
 * menu.kit.spec.ts: the Menu block on the specimen page, once per brand panel.
 * The live menu is the one in the "rest" cell, the long one is in "long list"; both popups portal
 * into a node in their cell. The "open", "disabled highlighted" and "choices" cells are held-open
 * pictures inside their own frames (.spec-menu-frame), which are inert, so nothing here interacts
 * with them. Every wait is on state, never on time.
 */

test.beforeEach(async ({ page }) => {
  await openSpecimen(page);
  // This block's own wait: the nine held-open popups (three per panel) have faded in.
  await page.waitForFunction(heldPopupsShown, {
    frame: ".spec-menu-frame",
    popup: ".orr-menu__popup",
    count: 9,
  });
});

const block = (page: Page, id: string) =>
  panel(page, id).locator('[data-block="Menu"]');
const cell = (page: Page, id: string, name: string) =>
  block(page, id).locator(`[data-cell="${name}"]`);

/** A live menu: its cell, trigger and popup. */
function live(page: Page, id: string, name = "rest", trigger = "Chart") {
  const c = cell(page, id, name);
  return {
    cell: c,
    trigger: c.getByRole("button", { name: trigger }),
    menu: c.getByRole("menu").first(),
  };
}

/** Waits until the open popup has finished fading in. */
async function settledOpen(menu: Locator) {
  await expect(menu).toBeVisible();
  await menu.evaluate(
    (m) =>
      new Promise<void>((resolve) => {
        const tick = () =>
          getComputedStyle(m).opacity === "1" && m.getAnimations().length === 0
            ? resolve()
            : requestAnimationFrame(tick);
        tick();
      }),
  );
}

const highlighted = (menu: Locator) => menu.locator("[data-highlighted]");
const item = (menu: Locator, name: string) =>
  menu.getByRole("menuitem", { name, exact: true });

/** Opens the live menu from the keyboard, so the first item is highlighted. */
async function openByKey(
  page: Page,
  id: string,
  key = "ArrowDown",
  name = "rest",
  trigger = "Chart",
) {
  const l = live(page, id, name, trigger);
  await l.trigger.focus();
  await page.keyboard.press(key);
  await settledOpen(l.menu);
  return l;
}

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
  test.describe(`panel ${id}: Menu`, () => {
    test("trigger: a button that names a collapsed menu", async ({ page }) => {
      const { trigger } = live(page, id);
      await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    test("opens on a click; aria-expanded follows; Escape closes and returns focus", async ({
      page,
    }) => {
      const { trigger, menu } = live(page, id);
      await trigger.click();
      await settledOpen(menu);
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toBeFocused();
    });

    for (const key of ["Enter", "Space", "ArrowDown"]) {
      test(`opens on ${key} from the focused trigger, with the first item highlighted`, async ({
        page,
      }) => {
        const { trigger, menu } = await openByKey(page, id, key);
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(highlighted(menu)).toHaveText("Rename");
      });
    }

    test("ArrowUp opens with the last item highlighted", async ({ page }) => {
      const { menu } = await openByKey(page, id, "ArrowUp");
      await expect(highlighted(menu)).toHaveText("Zoom");
    });

    test("arrows move the highlight and wrap; Home and End jump; typing finds an item", async ({
      page,
    }) => {
      const { menu } = await openByKey(page, id);
      await expect(highlighted(menu)).toHaveText("Rename");
      await page.keyboard.press("ArrowDown");
      await expect(highlighted(menu)).toHaveText(/^Duplicate/);
      await page.keyboard.press("ArrowUp");
      await expect(highlighted(menu)).toHaveText("Rename");
      await page.keyboard.press("ArrowUp");
      await expect(highlighted(menu)).toHaveText("Zoom");
      await page.keyboard.press("ArrowDown");
      await expect(highlighted(menu)).toHaveText("Rename");
      await page.keyboard.press("End");
      await expect(highlighted(menu)).toHaveText("Zoom");
      await page.keyboard.press("Home");
      await expect(highlighted(menu)).toHaveText("Rename");
      await page.keyboard.type("g");
      await expect(highlighted(menu)).toHaveText("Grid");
    });

    test("Enter runs the item, closes the menu and returns focus to the trigger", async ({
      page,
    }) => {
      const { cell: c, trigger, menu } = await openByKey(page, id);
      await page.keyboard.type("d");
      await expect(highlighted(menu)).toHaveText(/^Duplicate/);
      await page.keyboard.press("Enter");
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
      await expect(c.getByTestId("last-action")).toHaveText("duplicate");
    });

    test("a click on an item runs it and closes the menu", async ({ page }) => {
      const { cell: c, trigger, menu } = live(page, id);
      await trigger.click();
      await settledOpen(menu);
      await item(menu, "Rename").click();
      await expect(menu).toBeHidden();
      await expect(c.getByTestId("last-action")).toHaveText("rename");
    });

    test("an outside press closes it", async ({ page }) => {
      const { trigger, menu } = live(page, id);
      await trigger.click();
      await settledOpen(menu);
      await page.mouse.click(4, 4);
      await expect(menu).toBeHidden();
    });

    test("a disabled item stays reachable but never runs or closes the menu", async ({
      page,
    }) => {
      const { cell: c, menu } = await openByKey(page, id);
      const disabled = item(menu, "Export as image");
      await expect(disabled).toHaveAttribute("aria-disabled", "true");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await expect(highlighted(menu)).toHaveText("Export as image");
      await page.keyboard.press("Enter");
      await expect(menu).toBeVisible();
      await expect(c.getByTestId("last-action")).toHaveText("");
      await disabled.click({ force: true });
      await expect(menu).toBeVisible();
      await expect(c.getByTestId("last-action")).toHaveText("");
    });

    test("a checkbox item toggles and the menu stays open", async ({
      page,
    }) => {
      const { menu } = await openByKey(page, id);
      const grid = menu.getByRole("menuitemcheckbox", { name: "Grid" });
      await expect(grid).toHaveAttribute("aria-checked", "true");
      await grid.click();
      await expect(grid).toHaveAttribute("aria-checked", "false");
      await expect(menu).toBeVisible();
      await expect(grid.locator(".orr-menu__indicator")).toHaveCSS(
        "visibility",
        "hidden",
      );
      await page.keyboard.press("Space");
      await expect(grid).toHaveAttribute("aria-checked", "true");
      await expect(grid.locator(".orr-menu__indicator")).toHaveCSS(
        "visibility",
        "visible",
      );
    });

    test("radio items choose one value in their group and the menu stays open", async ({
      page,
    }) => {
      const { menu } = await openByKey(page, id);
      const group = menu.getByRole("group", { name: "Projection" });
      const polar = group.getByRole("menuitemradio", { name: "Polar" });
      const flat = group.getByRole("menuitemradio", { name: "Flat" });
      await expect(polar).toHaveAttribute("aria-checked", "true");
      await expect(flat).toHaveAttribute("aria-checked", "false");
      await flat.click();
      await expect(flat).toHaveAttribute("aria-checked", "true");
      await expect(polar).toHaveAttribute("aria-checked", "false");
      await expect(menu).toBeVisible();
    });

    test("a submenu opens on ArrowRight and Escape closes only it, returning focus to its trigger", async ({
      page,
    }) => {
      const { cell: c, menu } = await openByKey(page, id, "ArrowUp");
      const zoom = menu.getByRole("menuitem", { name: "Zoom", exact: true });
      await expect(highlighted(menu).first()).toHaveText("Zoom");
      await page.keyboard.press("ArrowRight");
      const sub = c.getByRole("menu", { name: "Zoom" });
      await expect(sub).toBeVisible();
      await expect(zoom).toHaveAttribute("aria-expanded", "true");
      await expect(
        sub.getByRole("menuitem", { name: "Zoom in" }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(sub).toBeHidden();
      await expect(menu).toBeVisible();
      await expect(zoom).toBeFocused();
      // The submenu's own item runs and closes the whole tree.
      await page.keyboard.press("ArrowRight");
      await expect(sub).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(menu).toBeHidden();
      await expect(c.getByTestId("last-action")).toHaveText("zoom-in");
    });

    test("hit area: the trigger and every item are at least 44px tall", async ({
      page,
    }) => {
      const { trigger, menu } = live(page, id);
      await trigger.click();
      await settledOpen(menu);
      const heights = await menu
        .locator('[role^="menuitem"]')
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      expect(heights.length).toBe(7);
      for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
      expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    });

    test("the open popup stays in its cell, under the panel's brand, and is on top at its centre", async ({
      page,
    }) => {
      const { cell: c, trigger, menu } = live(page, id);
      await trigger.click();
      await settledOpen(menu);
      expect(
        await menu.evaluate((el, panelId) => {
          const root = el.closest("[data-brand]") as HTMLElement;
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          );
          return {
            owner: root.getAttribute("data-panel"),
            panelId,
            onTop: !!top && el.contains(top),
          };
        }, id),
      ).toEqual({ owner: id, panelId: id, onTop: true });
      await expect(c.locator(".orr-menu__popup")).toHaveCount(1);
    });

    test("highlight: the highlighted item's fill is at least 3:1 against the popup fill", async ({
      page,
    }) => {
      const { menu } = await openByKey(page, id);
      const colors = await menu.evaluate((m) => {
        const it = m.querySelector("[data-highlighted]") as HTMLElement;
        const cs = getComputedStyle(it);
        // The popup is the floating level's fill; the highlight is the floating level's properties.
        const root = m.closest("[data-brand]") as HTMLElement;
        const probe = (v: string) => {
          const s = document.createElement("span");
          s.style.color = `var(${v})`;
          m.append(s);
          const c = getComputedStyle(s).color;
          s.remove();
          return c;
        };
        return {
          fill: cs.backgroundColor,
          text: cs.color,
          popup: getComputedStyle(m).backgroundColor,
          highlightFill: probe("--orr-highlight-fill"),
          highlightText: probe("--orr-highlight-text"),
          root: root.tagName,
        };
      });
      expect(colors.fill).toBe(colors.highlightFill);
      expect(colors.text).toBe(colors.highlightText);
      expect(
        contrastInPage([colors.fill, colors.popup]),
      ).toBeGreaterThanOrEqual(3);
      expect(contrastInPage([colors.text, colors.fill])).toBeGreaterThanOrEqual(
        4.5,
      );
    });

    test("disabled item highlighted: popup fill, readable muted text, a visible inset ring", async ({
      page,
    }) => {
      const { menu } = await openByKey(page, id);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await expect(highlighted(menu)).toHaveText("Export as image");
      const m = await menu.evaluate((popup) => {
        const it = popup.querySelector("[data-highlighted]") as HTMLElement;
        const cs = getComputedStyle(it);
        return {
          fill: cs.backgroundColor,
          text: cs.color,
          popup: getComputedStyle(popup).backgroundColor,
          shadow: cs.boxShadow,
        };
      });
      expect(m.fill).toBe(m.popup);
      expect(m.shadow).toContain("inset");
      expect(contrastInPage([m.text, m.fill])).toBeGreaterThanOrEqual(4.5);
    });

    test("placement: opens below the trigger at the kit's offset; a long list is clamped to the kit's max height and scrolls", async ({
      page,
    }) => {
      const { trigger, menu } = live(page, id, "long list", "Bodies");
      await trigger.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await trigger.click();
      await settledOpen(menu);
      const m = await menu.evaluate((popup) => {
        const t = document.querySelector(
          '[data-block="Menu"] [aria-expanded="true"]',
        ) as HTMLElement;
        const positioner = popup.closest(".orr-menu__positioner")!;
        const read = (name: string) =>
          getComputedStyle(positioner).getPropertyValue(name);
        const probe = document.createElement("div");
        probe.style.height = read("--orr-menu-max-height");
        probe.style.position = "absolute";
        positioner.append(probe);
        const max = probe.getBoundingClientRect().height;
        probe.style.height = read("--orr-menu-offset");
        const offset = probe.getBoundingClientRect().height;
        probe.remove();
        const p = popup.getBoundingClientRect();
        return {
          gap: Math.round(p.top - t.getBoundingClientRect().bottom),
          offset,
          height: Math.round(p.height),
          max,
          overflows: popup.scrollHeight > popup.clientHeight,
        };
      });
      expect(m.gap).toBe(m.offset);
      expect(m.height).toBe(m.max);
      expect(m.overflows).toBe(true);
    });

    test("axe: no violations, closed", async ({ page }) => {
      expect(await violations(page, id)).toEqual([]);
    });

    test("axe: no violations, a live menu open with a submenu", async ({
      page,
    }) => {
      // The trigger at the top of the window, so the popup has room and does not scroll.
      await live(page, id).trigger.evaluate((el) =>
        el.scrollIntoView({ block: "start" }),
      );
      const { menu } = await openByKey(page, id, "ArrowUp");
      await page.keyboard.press("ArrowRight");
      await expect(page.getByRole("menu", { name: "Zoom" })).toBeVisible();
      await expect(menu).toBeVisible();
      expect(await violations(page, id)).toEqual([]);
    });
  });
}

for (const [pref, transform] of [
  ["no-preference", true],
  ["reduce", false],
] as const) {
  test.describe(`prefers-reduced-motion: ${pref}`, () => {
    test(`the popup's transition ${transform ? "includes" : "has no"} transform`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: pref });
      const { trigger, menu } = live(page, "orrery-light");
      await trigger.click();
      await settledOpen(menu);
      const property = await menu.evaluate(
        (m) => getComputedStyle(m).transitionProperty,
      );
      expect(property.includes("transform")).toBe(transform);
      expect(property).toContain("opacity");
    });
  });
}

test.describe("right to left", () => {
  const id = "orrery-light";

  test("the popup aligns to the trigger's start edge; ArrowLeft opens the submenu and the chevron points to it", async ({
    page,
  }) => {
    const c = cell(page, id, "rest");
    // The cell moves right, so the submenu has room on the left, the end side in right-to-left text.
    await c.evaluate((el) => {
      el.setAttribute("dir", "rtl");
      el.style.marginRight = "-300px";
      el.style.marginLeft = "300px";
    });
    const { trigger, menu } = await openByKey(page, id, "ArrowUp");
    const edges = await menu.evaluate((popup) => {
      const t = document.querySelector(
        '[data-block="Menu"] [aria-expanded="true"]',
      ) as HTMLElement;
      const p = popup.getBoundingClientRect();
      const r = t.getBoundingClientRect();
      return { popupRight: p.right, triggerRight: r.right };
    });
    expect(Math.abs(edges.popupRight - edges.triggerRight)).toBeLessThanOrEqual(
      1,
    );
    const chevron = menu.locator(".orr-menu__chevron");
    expect(await chevron.evaluate((el) => getComputedStyle(el).transform)).toBe(
      "matrix(-1, 0, 0, 1, 0, 0)",
    );
    await page.keyboard.press("ArrowLeft");
    const sub = c.getByRole("menu", { name: "Zoom" });
    await expect(sub).toBeVisible();
    // The submenu opens on the end side, which is the left in right-to-left text.
    const sides = await sub.evaluate((s, parent) => {
      const p = document.querySelector(parent)!.getBoundingClientRect();
      return { subLeft: s.getBoundingClientRect().left, parentLeft: p.left };
    }, '[data-cell="rest"] .orr-menu__popup');
    expect(sides.subLeft).toBeLessThan(sides.parentLeft);
    await page.keyboard.press("Escape");
    await expect(sub).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});

test.describe("overflow: a 400px window", () => {
  test.use({ viewport: { width: 400, height: 900 } });
  const id = "orrery-light";

  test("a long item truncates inside the popup, which stays inside the window and scrolls", async ({
    page,
  }) => {
    const { trigger, menu } = live(page, id, "long list", "Bodies");
    await trigger.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await trigger.click();
    await settledOpen(menu);
    const m = await menu.evaluate((popup) => {
      const r = popup.getBoundingClientRect();
      const long = popup.querySelector(".orr-menu__item-text") as HTMLElement;
      return {
        left: r.left,
        right: r.right,
        width: window.innerWidth,
        itemFits: popup.scrollWidth <= popup.clientWidth,
        ellipsis: getComputedStyle(long).textOverflow,
        scrolls: popup.scrollHeight > popup.clientHeight,
      };
    });
    expect(m.left).toBeGreaterThanOrEqual(0);
    expect(m.right).toBeLessThanOrEqual(m.width);
    expect(m.itemFits).toBe(true);
    expect(m.ellipsis).toBe("ellipsis");
    expect(m.scrolls).toBe(true);
    await page.keyboard.press("End");
    await expect(highlighted(menu)).toHaveText("Vesta");
    const last = await item(menu, "Vesta").boundingBox();
    const box = await menu.boundingBox();
    expect(last!.y + last!.height).toBeLessThanOrEqual(
      box!.y + box!.height + 1,
    );
  });
});

test.describe("golden example (fixtures/kit-examples.html)", () => {
  test("Menu example: a plain item runs and reports; choice items change in place and keep the menu open; the disabled item never runs", async ({
    page,
  }) => {
    await page.goto("/fixtures/kit-examples.html");
    const example = page.locator('[data-example="kit/menu/Menu.example.tsx"]');
    const trigger = example.getByRole("button", { name: "Chart" });
    const status = example.getByRole("status");
    await expect(status).toContainText("Nothing yet.");

    await trigger.click();
    // The example's popup opens in the top layer, beside its trigger in the example's section.
    const menu = page.getByRole("menu").first();
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitemcheckbox", { name: "Body labels" }).click();
    await expect(menu).toBeVisible();
    await expect(status).toContainText("labels on");
    await menu.getByRole("menuitemradio", { name: "Flat" }).click();
    await expect(status).toContainText("flat.");
    await menu.getByRole("menuitem", { name: "Export as image" }).click({
      force: true,
    });
    await expect(menu).toBeVisible();
    await expect(status).not.toContainText("export");

    await menu.getByRole("menuitem", { name: "Rename" }).click();
    await expect(menu).toBeHidden();
    await expect(status).toContainText("Ran rename.");
    await expect(trigger).toBeFocused();
  });
});

test.describe("WAI-ARIA pattern (UI SDK checkPattern)", () => {
  for (const id of PANELS) {
    test(`${id}: the open live menu passes checkPattern "menu"`, async ({
      page,
    }) => {
      // Transitions off, so the check reads the settled DOM after each key it presses.
      await transitionsOff(page);
      const { menu } = await openByKey(page, id);
      expect(
        await patternProblems(
          page,
          `[data-panel="${id}"] [data-block="Menu"] [data-cell="rest"] [role="menu"]`,
          "menu",
        ),
      ).toBe("");
      await expect(menu).toBeVisible();
    });
  }
});
