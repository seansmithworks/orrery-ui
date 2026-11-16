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
 * Card behaviour: element, passthrough, focus ring, roles and contrast, once per panel.
 * The cells are in example/kit/specimens/card.specimen.tsx.
 */

test.beforeEach(({ page }) => openSpecimen(page));

const cell = (page: Page, id: string, name: string) =>
  panel(page, id).locator(`[data-block="Card"] [data-cell="${name}"]`);

/** Computed colours of a cell's card, composited: text over fill over page, border over fill over page. */
async function colours(page: Page, id: string, name: string) {
  return page.evaluate(
    ({ id, name }) => {
      type RGBA = [number, number, number, number];
      const parse = (s: string): RGBA => {
        const m = s.match(/^rgba?\(([^)]+)\)$/);
        if (m) {
          const [r, g, b, a = "1"] = m[1].split(/[\s,/]+/).filter(Boolean);
          return [+r, +g, +b, +a];
        }
        const c = s.match(/^color\(srgb ([^)]+)\)$/);
        if (c) {
          const [r, g, b, a = "1"] = c[1].split(/[\s/]+/).filter(Boolean);
          return [+r * 255, +g * 255, +b * 255, +a];
        }
        throw new Error(`unparsed colour: ${s}`);
      };
      const over = (top: RGBA, under: RGBA): RGBA => {
        const a = top[3] + under[3] * (1 - top[3]);
        const ch = (i: number) =>
          (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a;
        return [ch(0), ch(1), ch(2), a];
      };
      const root = document.querySelector(
        `[data-panel="${id}"] [data-block="Card"] [data-cell="${name}"]`,
      )!;
      const card = root.querySelector(".orr-card") as HTMLElement;
      const p = document.querySelector(`[data-panel="${id}"]`) as HTMLElement;
      const cs = getComputedStyle(card);
      const page = over(
        parse(getComputedStyle(p).backgroundColor),
        [255, 255, 255, 1],
      );
      const fill = over(parse(cs.backgroundColor), page);
      const border = over(parse(cs.borderTopColor), fill);
      const text = over(parse(cs.color), fill);
      return { page, fill, border, text, borderWidth: cs.borderTopWidth };
    },
    { id, name },
  );
}

const lum = ([r, g, b]: number[]) => {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

for (const id of PANELS) {
  test.describe(`Card, panel ${id}`, () => {
    test("renders as div by default and as the element asked for", async ({
      page,
    }) => {
      expect(
        await cell(page, id, "rest")
          .locator(".orr-card")
          .evaluate((e) => e.tagName),
      ).toBe("DIV");
      expect(
        await cell(page, id, "parts")
          .locator(".orr-card")
          .evaluate((e) => e.tagName),
      ).toBe("ARTICLE");
    });

    test("passes className, aria-* and ref through", async ({ page }) => {
      const card = cell(page, id, "parts").locator(".orr-card");
      await expect(card).toHaveClass(/\borr-card\b.*\bcard-extra\b/);
      await expect(card).toHaveAttribute("aria-labelledby", `${id}-card-title`);
      await expect(card).toHaveAttribute("data-ref", "ARTICLE");
      await expect(
        page.locator(`[data-panel="${id}"] [id="${id}-card-title"]`),
      ).toHaveText("Rename orbit");
    });

    test("a focused child's ring is not clipped by the card", async ({
      page,
    }) => {
      for (const [name, target] of [
        ["button", "button"],
        ["field", "input"],
      ] as const) {
        const c = cell(page, id, name);
        await c.locator(".orr-card").evaluate((e) => {
          const o = getComputedStyle(e);
          if (o.overflowX !== "visible" || o.overflowY !== "visible")
            throw new Error("card clips its content");
        });
        await c.locator(target).first().focus();
        const ring = await focusRing(page, id);
        expectRing(ring);
        // The ring's box against the card: it may reach past the card's padding edge, never be cut.
        expect(ring.clippedBy).toEqual([]);
      }
    });

    test("long content wraps inside the card", async ({ page }) => {
      const fits = await cell(page, id, "overflow").evaluate((c) => {
        const card = c.querySelector(".orr-card") as HTMLElement;
        const text = c.querySelector("p") as HTMLElement;
        const a = card.getBoundingClientRect();
        const r = document.createRange();
        r.selectNodeContents(text);
        return [...r.getClientRects()].every(
          (b) => b.left >= a.left && b.right <= a.right,
        );
      });
      expect(fits).toBe(true);
    });

    test("axe: no violations", async ({ page }) => {
      expect(await violations(page, id)).toEqual([]);
    });

    test("adds no role and no tab stop of its own", async ({ page }) => {
      const cards = panel(page, id).locator('[data-block="Card"] .orr-card');
      const n = await cards.count();
      expect(n).toBe(5);
      for (let i = 0; i < n; i++) {
        const card = cards.nth(i);
        await expect(card).not.toHaveAttribute("role", /.*/);
        await expect(card).not.toHaveAttribute("tabindex", /.*/);
      }
      // Tabbing through the block lands only on the Buttons and Inputs inside the cards.
      const stops = await panel(page, id)
        .locator('[data-block="Card"]')
        .evaluate((block) => {
          const sel =
            'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';
          return [...block.querySelectorAll(sel)].map((e) => e.tagName);
        });
      expect(stops).toEqual(["BUTTON", "INPUT", "BUTTON", "BUTTON"]);
    });

    test("contrast: text on the fill is at least 4.5:1; the edge is measured", async ({
      page,
    }, info) => {
      for (const name of ["rest", "button", "field", "parts", "overflow"]) {
        const c = await colours(page, id, name);
        const text = ratio(c.text, c.fill);
        const edge = ratio(c.border, c.page);
        const fillEdge = ratio(c.fill, c.page);
        info.annotations.push({
          type: `contrast ${name}`,
          description: `text/fill ${text.toFixed(2)}, border/page ${edge.toFixed(2)}, fill/page ${fillEdge.toFixed(2)}`,
        });
        console.log(
          `card ${id} ${name}: text/fill ${text.toFixed(2)}, border/page ${edge.toFixed(2)}, fill/page ${fillEdge.toFixed(2)}`,
        );
        expect(text).toBeGreaterThanOrEqual(4.5);
        // The border is drawn (width > 0) and distinguishable at all; the 3:1 edge question is the owner's.
        expect(parseFloat(c.borderWidth)).toBeGreaterThan(0);
        expect(edge).toBeGreaterThan(1);
      }
    });
  });
}
