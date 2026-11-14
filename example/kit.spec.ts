import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * kit.spec.ts: the kit exemplars (Button, IconButton, Field with Input, Dialog) on the
 * specimen page, once per brand panel: orrery light, orrery dark, solar.
 * Per component: axe, keyboard, focus ring, hit area, reduced motion.
 * No screenshot baselines here; those land after Sean approves the look.
 */

const PANELS = ["orrery-light", "orrery-dark", "solar"] as const;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const LIVE_POPUP = ".orr-dialog__viewport:not([data-contained]) .orr-dialog";

test.beforeEach(async ({ page }) => {
  // The specimen links Google Fonts for brand solar; never touch the network in a test.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
  await page.goto("/kit.html");
  // The three static dialogs have faded in.
  await page.waitForFunction(() => {
    const popups = [
      ...document.querySelectorAll(
        ".orr-dialog__viewport[data-contained] .orr-dialog",
      ),
    ];
    return (
      popups.length === 3 &&
      popups.every((p) => getComputedStyle(p).opacity === "1")
    );
  });
});

const panel = (page: Page, id: string) => page.locator(`[data-panel="${id}"]`);
const trigger = (p: Locator) => p.getByRole("button", { name: "Rename orbit" });

async function violations(page: Page, include: string) {
  const wcag = await new AxeBuilder({ page })
    .include(include)
    .withTags(TAGS)
    .analyze();
  const labelInName = await new AxeBuilder({ page })
    .include(include)
    .withRules(["label-content-name-mismatch"])
    .analyze();
  return [...wcag.violations, ...labelInName.violations].map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
}

async function openLive(page: Page, p: Locator) {
  await trigger(p).focus();
  await page.keyboard.press("Enter");
  const dialog = page
    .getByRole("dialog", { name: "Rename orbit" })
    .and(page.locator(LIVE_POPUP));
  await expect(dialog).toBeVisible();
  await page.waitForFunction(
    (sel) => getComputedStyle(document.querySelector(sel)!).opacity === "1",
    LIVE_POPUP,
  );
  return dialog;
}

/** The focused element's ring: style, width and colour, against the panel's own tokens, and whether any clipping ancestor cuts it. */
async function focusRing(page: Page, panelId: string) {
  return page.evaluate((id) => {
    const el = document.activeElement as HTMLElement;
    const root = document.querySelector(`[data-panel="${id}"]`) as HTMLElement;
    const cs = getComputedStyle(el);
    const probe = document.createElement("span");
    probe.style.color = "var(--accent)";
    root.append(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    const ringWidth = getComputedStyle(root)
      .getPropertyValue("--ring-width")
      .trim();
    const reach = parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth);
    const r = el.getBoundingClientRect();
    const ring = {
      left: r.left - reach,
      top: r.top - reach,
      right: r.right + reach,
      bottom: r.bottom + reach,
    };
    const clippedBy: string[] = [];
    for (let a = el.parentElement; a; a = a.parentElement) {
      const o = getComputedStyle(a);
      if (o.overflowX === "visible" && o.overflowY === "visible") continue;
      const b = a.getBoundingClientRect();
      if (
        ring.left < b.left ||
        ring.top < b.top ||
        ring.right > b.right ||
        ring.bottom > b.bottom
      )
        clippedBy.push(a.className || a.tagName);
    }
    return {
      inPanel: root.contains(el),
      style: cs.outlineStyle,
      width: cs.outlineWidth,
      offset: cs.outlineOffset,
      color: cs.outlineColor,
      ringWidth,
      accent,
      clippedBy,
    };
  }, panelId);
}

function expectRing(ring: Awaited<ReturnType<typeof focusRing>>) {
  expect(ring.inPanel).toBe(true);
  expect(ring.style).toBe("solid");
  expect(ring.ringWidth).toBe("2px");
  expect(ring.width).toBe(ring.ringWidth);
  expect(ring.offset).toBe(ring.ringWidth);
  expect(ring.color).toBe(ring.accent);
  expect(ring.clippedBy).toEqual([]);
}

for (const id of PANELS) {
  test.describe(`panel ${id}`, () => {
    test("axe: no violations, every component in every state", async ({
      page,
    }) => {
      expect(await violations(page, `[data-panel="${id}"]`)).toEqual([]);
    });

    test("axe: no violations with the live dialog open", async ({ page }) => {
      await openLive(page, panel(page, id));
      expect(await violations(page, `[data-panel="${id}"]`)).toEqual([]);
    });

    test("Button: Tab order, Enter and Space activate, disabled is skipped, loading is focusable and inert", async ({
      page,
    }) => {
      const p = panel(page, id);
      const table = p.locator(".spec-block").filter({
        has: page.getByRole("heading", { name: "Button", exact: true }),
      });
      const rows = table.locator("tbody tr");
      const rest = rows
        .filter({ hasText: /^rest/i })
        .getByRole("button")
        .first();
      const disabled = rows
        .filter({ hasText: /^disabled/i })
        .getByRole("button")
        .first();
      const loading = rows
        .filter({ hasText: /^loading/i })
        .getByRole("button")
        .first();

      // Live row: the input, then the trigger.
      await p.getByLabel("Search orbits").focus();
      await page.keyboard.press("Tab");
      await expect(trigger(p)).toBeFocused();

      await rest.evaluate((el) => {
        (window as unknown as { clicks: number }).clicks = 0;
        el.addEventListener(
          "click",
          () => (window as unknown as { clicks: number }).clicks++,
        );
      });
      await rest.focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Space");
      expect(
        await page.evaluate(
          () => (window as unknown as { clicks: number }).clicks,
        ),
      ).toBe(2);

      await expect(disabled).toBeDisabled();
      expect(
        await disabled.evaluate(
          (el) =>
            (el as HTMLElement).tabIndex < 0 ||
            (el as HTMLButtonElement).disabled,
        ),
      ).toBe(true);

      await loading.evaluate((el) => {
        (window as unknown as { loadingClicks: number }).loadingClicks = 0;
        el.addEventListener(
          "click",
          () =>
            (window as unknown as { loadingClicks: number }).loadingClicks++,
        );
      });
      await loading.focus();
      await expect(loading).toBeFocused();
      await expect(loading).toHaveAttribute("aria-busy", "true");
      await expect(loading).toHaveAttribute("aria-disabled", "true");
      await expect(loading).toHaveAccessibleName("Save");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Space");
      expect(
        await page.evaluate(
          () => (window as unknown as { loadingClicks: number }).loadingClicks,
        ),
      ).toBe(0);
    });

    test("IconButton: every one has an accessible name", async ({ page }) => {
      const names = await panel(page, id)
        .locator(".orr-button[data-icon]")
        .evaluateAll((els) =>
          els.map(
            (el) =>
              el.getAttribute("aria-label") ??
              el.getAttribute("aria-labelledby") ??
              "",
          ),
        );
      expect(names.length).toBeGreaterThan(0);
      expect(names.filter((n) => !n.trim())).toEqual([]);
    });

    test("Field: label, description and error are wired to the input", async ({
      page,
    }) => {
      const fields = panel(page, id).locator(".spec-fields .orr-field");
      const rest = fields.nth(0).getByRole("textbox");
      await expect(rest).toHaveAccessibleName("Email");
      await expect(rest).toHaveAccessibleDescription("We reply within a day.");
      const invalid = fields
        .filter({ hasText: "Enter a full address." })
        .getByRole("textbox");
      await expect(invalid).toHaveAttribute("aria-invalid", "true");
      await expect(invalid).toHaveAccessibleDescription(
        /Enter a full address\./,
      );
      await expect(
        fields
          .filter({ has: page.locator("input[disabled]") })
          .getByRole("textbox"),
      ).toBeDisabled();
      await expect(
        fields
          .filter({ has: page.locator("input[readonly]") })
          .getByRole("textbox"),
      ).not.toBeEditable();
      // Typing works in the live field.
      const live = panel(page, id).getByLabel("Search orbits");
      await live.fill("Kepler");
      await expect(live).toHaveValue("Kepler");
      await expect(live).toHaveAttribute("data-filled", "");
    });

    test("Dialog: Enter opens, focus is trapped, Escape closes, focus returns to the trigger", async ({
      page,
    }) => {
      const p = panel(page, id);
      const dialog = await openLive(page, p);
      expect(
        await dialog.evaluate((d) => d.contains(document.activeElement)),
      ).toBe(true);
      // Four tabbables inside (close, name, Cancel, Save): six presses each way wrap past both ends.
      for (const key of [
        ...Array(6).fill("Tab"),
        ...Array(6).fill("Shift+Tab"),
      ]) {
        await page.keyboard.press(key);
        expect(
          await dialog.evaluate((d) => d.contains(document.activeElement)),
        ).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger(p)).toBeFocused();
    });

    test("Dialog: Space opens on top of the page, an outside press closes", async ({ page }) => {
      const p = panel(page, id);
      await trigger(p).focus();
      await page.keyboard.press("Space");
      const dialog = page
        .getByRole("dialog", { name: "Rename orbit" })
        .and(page.locator(LIVE_POPUP));
      await expect(dialog).toBeVisible();
      // Nothing on the page paints over the open popup: every corner and the centre hit it.
      const covered = await dialog.evaluate((d) => {
        const r = d.getBoundingClientRect();
        const points = [
          [r.left + 8, r.top + 8],
          [r.right - 8, r.top + 8],
          [r.left + 8, r.bottom - 8],
          [r.right - 8, r.bottom - 8],
          [r.left + r.width / 2, r.top + r.height / 2],
        ];
        return points.filter(
          ([x, y]) => !d.contains(document.elementFromPoint(x, y)),
        );
      });
      expect(covered).toEqual([]);
      await page.mouse.click(4, 4);
      await expect(dialog).toBeHidden();
    });

    test("focus ring: --ring-width solid --accent, offset, never clipped (Button, IconButton, Input, Dialog close)", async ({
      page,
    }) => {
      const p = panel(page, id);
      await p.getByLabel("Search orbits").focus();
      expectRing(await focusRing(page, id));
      await page.keyboard.press("Tab");
      await expect(trigger(p)).toBeFocused();
      expectRing(await focusRing(page, id));

      const icon = p
        .locator("tbody tr")
        .filter({ hasText: /^rest/i })
        .locator(".orr-button[data-icon]")
        .first();
      await icon.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(icon).toBeFocused();
      expectRing(await focusRing(page, id));

      const dialog = await openLive(page, p);
      await dialog.getByRole("button", { name: "Close" }).focus();
      expectRing(await focusRing(page, id));
    });

    test("hit area: every Button and IconButton answers a press 22px from its centre; inputs are 44px tall", async ({
      page,
    }) => {
      const misses = await panel(page, id)
        .locator(".orr-button:not([data-preview~='active'])")
        .evaluateAll((els) => {
          const out: string[] = [];
          for (const el of els) {
            el.scrollIntoView({ block: "center", inline: "center" });
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const half = 21.5; // a 43px box around the centre: inside a 44px hit area
            for (const [x, y] of [
              [cx, cy - half],
              [cx, cy + half],
              [cx - half, cy],
              [cx + half, cy],
            ]) {
              if (
                document.elementFromPoint(x, y)?.closest(".orr-button") !== el
              ) {
                out.push(
                  `${el.getAttribute("aria-label") ?? el.textContent} ${Math.round(r.width)}x${Math.round(r.height)} misses at ${Math.round(x - cx)},${Math.round(y - cy)}`,
                );
                break;
              }
            }
          }
          return out;
        });
      expect(misses).toEqual([]);
      const heights = await panel(page, id)
        .locator(".orr-input")
        .evaluateAll((els) =>
          els.map((el) => el.getBoundingClientRect().height),
        );
      expect(heights.every((h) => h >= 44)).toBe(true);
    });
  });
}

/**
 * Records the live popup's transform on every frame while it opens, under the given motion
 * preference. page.emulateMedia, because `test.use({ reducedMotion })` is not an option this
 * Playwright version reads (it typechecks as unknown and leaves the media query unmatched).
 */
async function transformsWhileOpening(
  page: Page,
  id: string,
  reducedMotion: "reduce" | "no-preference",
) {
  await page.emulateMedia({ reducedMotion });
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(reducedMotion === "reduce");
  await page.evaluate((sel) => {
    const w = window as unknown as {
      seen: string[];
      transitionProperty: string;
    };
    w.seen = [];
    const t0 = performance.now();
    const tick = () => {
      const el = document.querySelector(sel);
      if (el) {
        w.seen.push(getComputedStyle(el).transform);
        w.transitionProperty = getComputedStyle(el).transitionProperty;
      }
      if (performance.now() - t0 < 600) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, LIVE_POPUP);
  await trigger(panel(page, id)).click();
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const w = window as unknown as {
      seen: string[];
      transitionProperty: string;
    };
    return { seen: w.seen, transitionProperty: w.transitionProperty };
  });
}

test.describe("reduced motion: reduce", () => {
  for (const id of PANELS) {
    test(`${id}: Dialog opens with opacity only, no transform`, async ({
      page,
    }) => {
      const { seen, transitionProperty } = await transformsWhileOpening(
        page,
        id,
        "reduce",
      );
      expect(seen.length).toBeGreaterThan(0);
      expect(transitionProperty).not.toContain("transform");
      expect(seen.filter((t) => t !== "none")).toEqual([]);
    });
  }
});

test.describe("reduced motion: no-preference (proves the check above can fail)", () => {
  test("orrery-light: Dialog opens with a transform", async ({ page }) => {
    const { seen, transitionProperty } = await transformsWhileOpening(
      page,
      "orrery-light",
      "no-preference",
    );
    expect(transitionProperty).toContain("transform");
    expect(seen.some((t) => t !== "none")).toBe(true);
  });
});
