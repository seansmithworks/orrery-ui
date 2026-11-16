import { test, expect, type Page } from "@playwright/test";
import {
  PANELS,
  openSpecimen,
  panel,
  violations,
  focusRing,
  expectRing,
} from "./kit-test";

/**
 * tabs.kit.spec.ts: the Tabs block on the specimen page, once per brand panel.
 * Roles and wiring (tablist, tab, aria-selected, tabpanel named by its tab), keyboard movement and
 * activation, disabled, the selected bar under the selected tab, focus ring, contrast from computed
 * styles, reduced motion, axe. Then the golden example.
 */

test.beforeEach(({ page }) => openSpecimen(page));

const cell = (page: Page, id: string, name: string) =>
  panel(page, id).locator(`[data-block="Tabs"] [data-cell="${name}"]`);
const tab = (page: Page, id: string, cellName: string, name: string) =>
  cell(page, id, cellName).getByRole("tab", { name });

/**
 * Contrast ratios read from computed styles, in the page. Every colour is composited over what is
 * painted behind it (alpha), down to the first opaque background.
 */
async function contrasts(page: Page, id: string) {
  return panel(page, id)
    .locator('[data-block="Tabs"] [data-cell]')
    .evaluateAll((cells) => {
      type C = [number, number, number, number];
      // Any CSS colour Chromium computes (rgb, rgba, color(srgb ...)) to 0-255 channels and alpha.
      const parse = (v: string): C => {
        const srgb =
          /color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)(?: \/ ([-\d.e]+))?\)/.exec(
            v,
          );
        if (srgb)
          return [
            +srgb[1] * 255,
            +srgb[2] * 255,
            +srgb[3] * 255,
            srgb[4] === undefined ? 1 : +srgb[4],
          ];
        const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(
          v,
        );
        if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
        throw new Error(`unparsed colour ${v}`);
      };
      const over = (top: C, under: C): C => {
        const a = top[3] + under[3] * (1 - top[3]);
        const ch = (i: number) =>
          a === 0
            ? 0
            : (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a;
        return [ch(0), ch(1), ch(2), a];
      };
      // The colour painted at an element's box: its own background over every ancestor's.
      const behind = (el: Element | null): C => {
        const stack: C[] = [];
        for (let a = el; a; a = a.parentElement) {
          const c = parse(getComputedStyle(a).backgroundColor);
          stack.push(c);
          if (c[3] === 1) break;
        }
        return stack.reduceRight<C>(
          (acc, c) => over(c, acc),
          [255, 255, 255, 1],
        );
      };
      const lum = ([r, g, b]: C) => {
        const f = (x: number) => {
          const s = x / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a: C, b: C) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
      };
      const out: Record<
        string,
        {
          barVsPage: number;
          selectedVsPage: number;
          unselectedVsPage: number[];
        }
      > = {};
      for (const c of cells) {
        const list = c.querySelector(".orr-tabs__list")!;
        const bar = c.querySelector(".orr-tabs__indicator")!;
        const page = behind(list);
        const text = (el: Element) =>
          ratio(over(parse(getComputedStyle(el).color), behind(el)), page);
        const tabs = [...c.querySelectorAll('[role="tab"]')];
        out[c.getAttribute("data-cell")!] = {
          barVsPage: ratio(behind(bar), page),
          selectedVsPage: text(
            tabs.find((t) => t.getAttribute("aria-selected") === "true")!,
          ),
          // Enabled unselected tabs only: a disabled label is exempt (WCAG 1.4.3).
          unselectedVsPage: tabs
            .filter(
              (t) =>
                t.getAttribute("aria-selected") === "false" &&
                !t.hasAttribute("data-disabled"),
            )
            .map(text),
        };
      }
      return out;
    });
}

/** The selected bar's painted span (its clip), relative to the list, and the selected tab's box. */
const barAndTab = (page: Page, id: string, cellName: string) =>
  cell(page, id, cellName)
    .locator(".orr-tabs__list")
    .evaluate((list) => {
      const bar = list.querySelector(".orr-tabs__indicator") as HTMLElement;
      const sel = list.querySelector('[aria-selected="true"]')!;
      const l = list.getBoundingClientRect();
      const b = bar.getBoundingClientRect();
      const t = sel.getBoundingClientRect();
      // clip-path: inset(<1 to 4 lengths>), as the margin shorthand: top, right, bottom, left.
      const clip = getComputedStyle(bar).clipPath;
      const px = /^inset\(([^)]*)\)$/
        .exec(clip)?.[1]
        .split(" ")
        .map((v) => parseFloat(v));
      const [, right, , left] = !px
        ? [NaN, NaN, NaN, NaN]
        : [px[0], px[1] ?? px[0], px[2] ?? px[0], px[3] ?? px[1] ?? px[0]];
      const r = (n: number) => Math.round(n * 10) / 10;
      return {
        hidden: bar.hidden,
        clip,
        barLeft: r(b.left - l.left + left),
        barRight: r(b.right - l.left - right),
        barBottom: r(b.bottom - l.top),
        tabLeft: r(t.left - l.left),
        tabRight: r(t.right - l.left),
        listBottom: r(l.height),
      };
    });

for (const id of PANELS) {
  test.describe(`panel ${id}`, () => {
    test("Tabs: tablist named, tabs with aria-selected, the panel named by its tab and wired both ways", async ({
      page,
    }) => {
      const c = cell(page, id, "first selected");
      const list = c.getByRole("tablist");
      await expect(list).toHaveAccessibleName("Orbit");
      await expect(c.getByRole("tab")).toHaveCount(3);
      const overview = tab(page, id, "first selected", "Overview");
      await expect(overview).toHaveAttribute("aria-selected", "true");
      await expect(tab(page, id, "first selected", "Moons")).toHaveAttribute(
        "aria-selected",
        "false",
      );
      // Only the selected tab's panel is in the page, named by that tab and controlled by it.
      const panels = c.getByRole("tabpanel");
      await expect(panels).toHaveCount(1);
      await expect(panels).toHaveAccessibleName("Overview");
      await expect(panels).toHaveText(/Period 27\.3 days/);
      const panelId = await panels.getAttribute("id");
      await expect(overview).toHaveAttribute("aria-controls", panelId!);
      // The other cell selects its second tab.
      await expect(
        cell(page, id, "second selected").getByRole("tabpanel"),
      ).toHaveAccessibleName("Moons");
    });

    test("Tabs: arrows move focus without selecting, Enter and Space select, Home and End jump, the ends loop", async ({
      page,
    }) => {
      const t = (name: string) => tab(page, id, "first selected", name);
      const panelOf = () =>
        cell(page, id, "first selected").getByRole("tabpanel");
      await t("Overview").focus();
      await page.keyboard.press("ArrowRight");
      await expect(t("Moons")).toBeFocused();
      await expect(t("Overview")).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("Enter");
      await expect(t("Moons")).toHaveAttribute("aria-selected", "true");
      await expect(panelOf()).toHaveAccessibleName("Moons");
      await page.keyboard.press("End");
      await expect(t("History")).toBeFocused();
      await page.keyboard.press("Space");
      await expect(t("History")).toHaveAttribute("aria-selected", "true");
      await expect(panelOf()).toHaveAccessibleName("History");
      await page.keyboard.press("ArrowRight");
      await expect(t("Overview")).toBeFocused();
      await page.keyboard.press("ArrowLeft");
      await expect(t("History")).toBeFocused();
      await page.keyboard.press("Home");
      await expect(t("Overview")).toBeFocused();
      // One tab stop: the selected tab is the list's only tabbable tab.
      const tabbable = await cell(page, id, "first selected")
        .getByRole("tab")
        .evaluateAll((els) => els.map((e) => (e as HTMLElement).tabIndex));
      expect(tabbable.filter((i) => i === 0)).toHaveLength(1);
    });

    test("Tabs: a disabled tab is aria-disabled, reachable by the arrow keys, and never selected by press, Enter or Space", async ({
      page,
    }) => {
      const t = (name: string) => tab(page, id, "disabled", name);
      const history = t("History");
      await expect(history).toHaveAttribute("aria-disabled", "true");
      await expect(history).toHaveAttribute("data-disabled", "");
      await history.click({ force: true });
      await expect(history).toHaveAttribute("aria-selected", "false");
      // Base UI keeps it focusable (focusableWhenDisabled), so the arrow keys reach it and a screen reader
      // announces it as unavailable; selecting it does nothing.
      await t("Moons").focus();
      await page.keyboard.press("ArrowRight");
      await expect(history).toBeFocused();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Space");
      await expect(history).toHaveAttribute("aria-selected", "false");
      await expect(t("Overview")).toHaveAttribute("aria-selected", "true");
      await expect(
        cell(page, id, "disabled").getByRole("tabpanel"),
      ).toHaveAccessibleName("Overview");
    });

    test("Tabs: the selected bar spans the selected tab, sits on the divider, and follows a new selection", async ({
      page,
    }) => {
      for (const name of ["first selected", "second selected"]) {
        const b = await barAndTab(page, id, name);
        expect(b.hidden, name).toBe(false);
        expect(b.clip, name).toMatch(/^inset\(/);
        expect(Math.abs(b.barLeft - b.tabLeft), name).toBeLessThanOrEqual(0.5);
        expect(Math.abs(b.barRight - b.tabRight), name).toBeLessThanOrEqual(
          0.5,
        );
        // Its bottom edge is the list's bottom edge (over the divider).
        expect(Math.abs(b.barBottom - b.listBottom), name).toBeLessThanOrEqual(
          0.5,
        );
      }
      await tab(page, id, "first selected", "History").click();
      await expect
        .poll(async () => {
          const b = await barAndTab(page, id, "first selected");
          return (
            Math.abs(b.barLeft - b.tabLeft) <= 0.5 &&
            Math.abs(b.barRight - b.tabRight) <= 0.5
          );
        })
        .toBe(true);
    });

    test("Tabs: focus ring is --ring-width solid --accent, offset, never clipped, on the tab and the panel", async ({
      page,
    }) => {
      const t = tab(page, id, "first selected", "Overview");
      await t.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(t).toBeFocused();
      expectRing(await focusRing(page, id));
      // Tab from the tab lands on its panel.
      await page.keyboard.press("Tab");
      await expect(
        cell(page, id, "first selected").getByRole("tabpanel"),
      ).toBeFocused();
      expectRing(await focusRing(page, id));
    });

    test("Tabs: contrast from computed styles, bar vs page 3:1, labels vs page 4.5:1", async ({
      page,
    }) => {
      const c = await contrasts(page, id);
      test.info().annotations.push({
        type: "contrast",
        description: JSON.stringify(c),
      });
      for (const [name, v] of Object.entries(c)) {
        expect(v.barVsPage, name).toBeGreaterThanOrEqual(3);
        expect(v.selectedVsPage, name).toBeGreaterThanOrEqual(4.5);
        for (const u of v.unselectedVsPage)
          expect(u, name).toBeGreaterThanOrEqual(4.5);
      }
    });

    test("Tabs: reduced motion drops the bar's slide", async ({ page }) => {
      const bar = cell(page, id, "first selected").locator(
        ".orr-tabs__indicator",
      );
      const slides = () =>
        bar.evaluate((el) => {
          const cs = getComputedStyle(el);
          const props = cs.transitionProperty.split(", ");
          const durs = cs.transitionDuration.split(", ");
          const i = props.indexOf("clip-path");
          return i >= 0 && parseFloat(durs[i % durs.length]) > 0;
        });
      expect(await slides()).toBe(true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(await slides()).toBe(false);
    });

    test("Tabs: axe, no violations in the panel", async ({ page }) => {
      expect(await violations(page, id)).toEqual([]);
    });
  });
}

test.describe("golden example (fixtures/kit-examples.html)", () => {
  test("Tabs example: the list is named by the heading and each tab shows its own panel", async ({
    page,
  }) => {
    await page.goto("/fixtures/kit-examples.html");
    const example = page.locator('[data-example="kit/tabs/Tabs.example.tsx"]');
    await expect(example.getByRole("tablist")).toHaveAccessibleName("Luna");
    await expect(example.getByRole("tabpanel")).toHaveText(/Period 27\.3/);
    await example.getByRole("tab", { name: "Passes" }).click();
    await expect(example.getByRole("tabpanel")).toHaveAccessibleName("Passes");
    await expect(example.getByRole("tabpanel")).toHaveText(/Next close pass/);
  });
});
