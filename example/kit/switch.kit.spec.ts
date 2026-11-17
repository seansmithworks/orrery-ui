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
 * switch.kit.spec.ts: the Switch block on the specimen page, once per brand panel.
 * Role and name, keyboard and label toggling, thumb travel, disabled, focus ring, invalid
 * wiring, hit area, contrast from computed styles, reduced motion, axe. Then the golden
 * example's form submission.
 */

test.beforeEach(({ page }) => openSpecimen(page));

const cell = (page: Page, id: string, name: string) =>
  panel(page, id).locator(`[data-block="Switch"] [data-cell="${name}"]`);
const control = (page: Page, id: string, name: string) =>
  cell(page, id, name).getByRole("switch");

/** Where the thumb sits inside the track: its gap to each inner edge (inside the border), in px. */
const thumbGaps = (page: Page, id: string, name: string) =>
  control(page, id, name).evaluate((el) => {
    const t = el.querySelector(".orr-switch__thumb")!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const b = parseFloat(getComputedStyle(el).borderLeftWidth);
    return {
      start: Math.round((t.left - r.left - b) * 10) / 10,
      end: Math.round((r.right - b - t.right) * 10) / 10,
    };
  });

/**
 * Contrast ratios read from computed styles, in the page. Every colour is composited over what is
 * painted behind it (alpha), down to the first opaque background.
 */
async function contrasts(page: Page, id: string) {
  return panel(page, id)
    .locator('[data-block="Switch"] [data-cell]')
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
        { trackVsPage: number; borderVsPage: number; thumbVsTrack: number }
      > = {};
      for (const c of cells) {
        const track = c.querySelector(".orr-switch")!;
        const thumb = c.querySelector(".orr-switch__thumb")!;
        const page = behind(track.parentElement);
        const fill = behind(track);
        const border = over(
          parse(getComputedStyle(track).borderTopColor),
          fill,
        );
        out[c.getAttribute("data-cell")!] = {
          trackVsPage: ratio(fill, page),
          borderVsPage: ratio(border, page),
          thumbVsTrack: ratio(behind(thumb), fill),
        };
      }
      return out;
    });
}

for (const id of PANELS) {
  test.describe(`panel ${id}`, () => {
    test("Switch: role switch, named by its label, described by its hint, aria-checked", async ({
      page,
    }) => {
      const off = control(page, id, "off");
      await expect(off).toHaveAccessibleName("Email me when an orbit changes");
      await expect(off).toHaveAccessibleDescription("At most one email a day.");
      await expect(off).toHaveAttribute("aria-checked", "false");
      await expect(off).toHaveAttribute("data-unchecked", "");
      const on = control(page, id, "on");
      await expect(on).toHaveAttribute("aria-checked", "true");
      await expect(on).toHaveAttribute("data-checked", "");
      await expect(
        panel(page, id).locator('[data-block="Switch"] [role="switch"]'),
      ).toHaveCount(9);
    });

    test("Switch: Space and Enter each toggle it, as Base UI defines", async ({
      page,
    }) => {
      const s = control(page, id, "off");
      await s.focus();
      await page.keyboard.press("Space");
      await expect(s).toHaveAttribute("aria-checked", "true");
      await page.keyboard.press("Space");
      await expect(s).toHaveAttribute("aria-checked", "false");
      await page.keyboard.press("Enter");
      await expect(s).toHaveAttribute("aria-checked", "true");
      await page.keyboard.press("Enter");
      await expect(s).toHaveAttribute("aria-checked", "false");
    });

    test("Switch: a press on the label text toggles it, once", async ({
      page,
    }) => {
      const s = control(page, id, "off");
      const label = cell(page, id, "off").locator("label");
      // Press the label well to the right of the track and its hit area: the text, not the control.
      const r = await label.boundingBox();
      expect(r).not.toBeNull();
      await label.click({ position: { x: r!.width - 8, y: r!.height / 2 } });
      await expect(s).toHaveAttribute("aria-checked", "true");
      await label.click({ position: { x: r!.width - 8, y: r!.height / 2 } });
      await expect(s).toHaveAttribute("aria-checked", "false");
      // A press on the track itself toggles once too (the label does not toggle it a second time).
      await s.click();
      await expect(s).toHaveAttribute("aria-checked", "true");
    });

    test("Switch: the thumb sits at the start when off and travels to the end when on", async ({
      page,
    }) => {
      const off = await thumbGaps(page, id, "off");
      const on = await thumbGaps(page, id, "on");
      // Same inset each side: the start gap off equals the end gap on.
      expect(off.start).toBe(on.end);
      expect(off.start).toBeGreaterThan(0);
      expect(off.end).toBeGreaterThan(off.start);
      expect(on.start).toBe(off.end);
      // A toggle carries it across (after its travel settles).
      await control(page, id, "off").click();
      await expect.poll(() => thumbGaps(page, id, "off")).toEqual(on);
    });

    test("Switch: disabled does not toggle by press, label press or keyboard, and is not in the tab order", async ({
      page,
    }) => {
      for (const [name, state] of [
        ["disabled off", "false"],
        ["disabled on", "true"],
      ] as const) {
        const s = control(page, id, name);
        await expect(s).toHaveAttribute("aria-disabled", "true");
        await expect(s).toHaveAttribute("aria-checked", state);
        await s.click({ force: true });
        await cell(page, id, name).locator("label").click({ force: true });
        await expect(s).toHaveAttribute("aria-checked", state);
        expect(await s.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
        await s.focus();
        await page.keyboard.press("Space");
        await page.keyboard.press("Enter");
        await expect(s).toHaveAttribute("aria-checked", state);
      }
    });

    test("Switch: focus ring is --ring-width solid --accent, offset, never clipped", async ({
      page,
    }) => {
      for (const name of ["off", "on"]) {
        const s = control(page, id, name);
        await s.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        await expect(s).toBeFocused();
        expectRing(await focusRing(page, id));
      }
    });

    test("Switch: invalid is wired to the control: aria-invalid, data-invalid, the error in its description", async ({
      page,
    }) => {
      const s = control(page, id, "invalid");
      await expect(s).toHaveAttribute("aria-invalid", "true");
      await expect(s).toHaveAttribute("data-invalid", "");
      await expect(s).toHaveAttribute("aria-required", "true");
      await expect(s).toHaveAccessibleName("Share usage data");
      await expect(s).toHaveAccessibleDescription(/Turn this on to continue\./);
      await expect(control(page, id, "off")).not.toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    test("Switch: the track draws under 44px high and answers a press 21.5px from its centre on each axis", async ({
      page,
    }) => {
      const result = await panel(page, id)
        .locator('[data-block="Switch"] .orr-switch')
        .evaluateAll((els) => {
          const out: string[] = [];
          for (const el of els) {
            el.scrollIntoView({ block: "center", inline: "center" });
            const r = el.getBoundingClientRect();
            if (r.width >= 44 || r.height >= 44)
              out.push(`drawn ${r.width}x${r.height}, expected under 44`);
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            // 21.5, not 22: a point exactly 22px out sits on the 44px hit area's edge.
            const half = 21.5;
            for (const [x, y] of [
              [cx, cy - half],
              [cx, cy + half],
              [cx - half, cy],
              [cx + half, cy],
            ]) {
              if (
                document.elementFromPoint(x, y)?.closest(".orr-switch") !== el
              ) {
                out.push(
                  `${el.getAttribute("aria-labelledby")} misses at ${Math.round(x - cx)},${Math.round(y - cy)}`,
                );
                break;
              }
            }
          }
          return { count: els.length, out };
        });
      expect(result.count).toBe(9);
      expect(result.out).toEqual([]);
    });

    test("Switch: a press above and left of the track, outside the track and its label, toggles it only through the ::after hit area", async ({
      page,
    }) => {
      const s = control(page, id, "off");
      await s.scrollIntoViewIfNeeded();
      // 20px left of and 18px above the track's centre: outside the 36x20 track on both axes, inside the 44px
      // hit area (22px each way), and outside the label's own box.
      const point = await s.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const l = el.closest("label")!.getBoundingClientRect();
        const x = r.left + r.width / 2 - 20;
        const y = r.top + r.height / 2 - 18;
        return {
          x,
          y,
          inTrack: x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
          inLabel: x >= l.left && x <= l.right && y >= l.top && y <= l.bottom,
        };
      });
      expect(point.inTrack).toBe(false);
      expect(point.inLabel).toBe(false);

      // Red proof: with the ::after removed, the same press toggles nothing.
      const style = await page.addStyleTag({
        content: ".orr-switch::after { content: none !important; }",
      });
      await page.mouse.click(point.x, point.y);
      await expect(s).toHaveAttribute("aria-checked", "false");
      await style.evaluate((el) => el.remove());

      await page.mouse.click(point.x, point.y);
      await expect(s).toHaveAttribute("aria-checked", "true");
    });

    test("Switch: contrast from computed styles, track on vs page and thumb vs track at least 3:1", async ({
      page,
    }) => {
      const c = await contrasts(page, id);
      test.info().annotations.push({
        type: "contrast",
        description: JSON.stringify(c),
      });
      // On: the track against the page.
      for (const name of ["on", "hover on"])
        expect(c[name].trackVsPage, name).toBeGreaterThanOrEqual(3);
      // Off: the track's fill or its border clears the page.
      for (const name of ["off", "hover off", "invalid"])
        expect(
          Math.max(c[name].trackVsPage, c[name].borderVsPage),
          name,
        ).toBeGreaterThanOrEqual(3);
      // The thumb against its track, on and off.
      for (const name of ["off", "on", "hover off", "hover on", "invalid"])
        expect(c[name].thumbVsTrack, name).toBeGreaterThanOrEqual(3);
    });

    test("Switch: reduced motion drops the thumb's travel animation", async ({
      page,
    }) => {
      const thumb = control(page, id, "off").locator(".orr-switch__thumb");
      const moving = () =>
        thumb.evaluate((el) => {
          const cs = getComputedStyle(el);
          const props = cs.transitionProperty.split(", ");
          const durs = cs.transitionDuration.split(", ");
          const i = props.indexOf("translate");
          return i >= 0 && parseFloat(durs[i % durs.length]) > 0;
        });
      expect(await moving()).toBe(true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(await moving()).toBe(false);
    });

    test("Switch: axe, no violations in the panel", async ({ page }) => {
      expect(await violations(page, id)).toEqual([]);
    });
  });
}

test.describe("golden example (fixtures/kit-examples.html)", () => {
  test("Switch example: the form sends the name of each switch that is on, and nothing for one that is off", async ({
    page,
  }) => {
    await page.goto("/fixtures/kit-examples.html");
    const example = page.locator(
      '[data-example="kit/switch/Switch.example.tsx"]',
    );
    const grid = example.getByRole("switch", { name: "Show grid lines" });
    const emails = example.getByRole("switch", {
      name: "Email me when an orbit changes",
    });
    const submit = example.getByRole("button", { name: "Save settings" });
    // Record the form data of every submit, before any handler runs.
    await page.evaluate(() => {
      const w = window as unknown as { submits: string[][][] };
      w.submits = [];
      document.addEventListener(
        "submit",
        (e) => {
          const data = new FormData(e.target as HTMLFormElement);
          w.submits.push([...data.entries()].map(([k, v]) => [k, String(v)]));
        },
        true,
      );
    });
    const lastSubmit = () =>
      page.evaluate(() =>
        (window as unknown as { submits: string[][][] }).submits.at(-1),
      );

    await expect(grid).toHaveAttribute("aria-checked", "true");
    await expect(emails).toHaveAttribute("aria-checked", "false");
    await submit.click();
    await expect(example.getByRole("status")).toHaveText("Settings saved.");
    expect(await lastSubmit()).toEqual([["gridLines", "on"]]);

    await grid.click();
    await emails.click();
    await submit.click();
    expect(await lastSubmit()).toEqual([["orbitEmails", "on"]]);
  });
});
