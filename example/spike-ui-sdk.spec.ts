import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";

/**
 * SPIKE (branch spike/ui-sdk-dialog, never merged). Two questions about Vercel's UI SDK:
 * 1. What does its `checkPattern(root, "dialog")` say about the existing Base UI Dialog on the
 *    unchanged kit specimen (example/kit.html)?
 * 2. Does a Dialog rebuilt on UI SDK behaviours (spike/ui-sdk/Dialog.tsx) match it?
 * checkPattern runs in the page: @ui-sdk/core/testing is bundled once with esbuild and injected,
 * so no existing page or kit file changes.
 */

let testingKit = "";
test.beforeAll(async () => {
  const out = await build({
    stdin: {
      contents:
        'import { checkPattern } from "@ui-sdk/core/testing"; window.uiSdkCheckPattern = checkPattern;',
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    format: "iife",
    write: false,
    logLevel: "silent",
  });
  testingKit = out.outputFiles[0].text;
});

/** Runs checkPattern on `rootSelector` in the page; "" when it finds no problems, else its message. */
async function patternProblems(page: Page, rootSelector: string) {
  await page.addScriptTag({ content: testingKit });
  return page.evaluate(async (sel) => {
    const check = (
      window as unknown as {
        uiSdkCheckPattern: (root: Element, p: string) => Promise<void>;
      }
    ).uiSdkCheckPattern;
    try {
      await check(document.querySelector(sel)!, "dialog");
      return "";
    } catch (e) {
      return (e as Error).message;
    }
  }, rootSelector);
}

const noFonts = (page: Page) =>
  page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );

test.describe("step 2: checkPattern on the Base UI Dialog (kit.html, unchanged)", () => {
  test.beforeEach(async ({ page }) => {
    await noFonts(page);
    await page.goto("/kit.html");
  });

  for (const transitions of ["on", "off"] as const) {
    test(`dialog pattern, orrery-light live dialog, transitions ${transitions}`, async ({
      page,
    }, info) => {
      // "off" classifies the Escape finding: with no exit transition the popup unmounts at once.
      if (transitions === "off")
        await page.addStyleTag({
          content: "*, *::before, *::after { transition: none !important; }",
        });
      const p = page.locator('[data-panel="orrery-light"]');
      await p.getByRole("button", { name: "Rename orbit" }).focus();
      await page.keyboard.press("Enter");
      const dialog = page
        .getByRole("dialog", { name: "Rename orbit" })
        .and(page.locator(".spec-portals .orr-dialog"));
      await expect(dialog).toBeVisible();
      // What Base UI does instead of aria-modal: the page behind, and the trigger's ARIA.
      const facts = await page.evaluate(() => {
        const d = document.querySelector(".spec-portals .orr-dialog")!;
        const t = document.querySelector(
          '[data-panel="orrery-light"] .spec-live .orr-button',
        )!;
        const main = document.querySelector("main.spec")!;
        return {
          ariaModal: d.getAttribute("aria-modal"),
          mainInert: main.closest("[inert]") !== null,
          mainAriaHidden: main.closest("[aria-hidden=true]") !== null,
          triggerAriaControls: t.getAttribute("aria-controls"),
          triggerAriaExpanded: t.getAttribute("aria-expanded"),
          triggerAriaHaspopup: t.getAttribute("aria-haspopup"),
        };
      });
      console.log(`[base-ui facts] ${JSON.stringify(facts)}`);
      // Root is the panel's portal wrapper: the page root would find the three static, always-open
      // specimen dialogs first.
      const problems = await patternProblems(
        page,
        '[data-portal-for="orrery-light"]',
      );
      // Recorded, not asserted: the spike reports what checkPattern says.
      info.annotations.push({
        type: "checkPattern",
        description: problems || "no problems",
      });
      console.log(
        `[checkPattern base-ui, transitions ${transitions}]\n${problems || "no problems"}`,
      );
    });
  }

  test("a real (trusted) Escape closes the Base UI dialog and returns focus", async ({
    page,
  }) => {
    const t = page
      .locator('[data-panel="orrery-light"]')
      .getByRole("button", { name: "Rename orbit" });
    await t.focus();
    await page.keyboard.press("Enter");
    const dialog = page.locator(".spec-portals .orr-dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(t).toBeFocused();
  });
});

/**
 * Step 3: parity. example/spike-ui-sdk.html renders the same markup on either Dialog
 * (?impl=base: kit/dialog on Base UI; ?impl=sdk: spike/ui-sdk on UI SDK). Every test runs on both.
 */
for (const impl of ["base", "sdk"] as const) {
  test.describe(`step 3 parity: ${impl}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/spike-ui-sdk.html?impl=${impl}`);
    });

    const trigger = (page: Page) =>
      page.getByRole("button", { name: "Rename orbit" });
    const dialog = (page: Page) =>
      page.getByRole("dialog", { name: "Rename orbit" });
    const inside = (page: Page) =>
      page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        const a = document.activeElement;
        // A Base UI focus guard holds focus for a moment before it bounces it back in.
        return (
          !!d &&
          !!a &&
          (d.contains(a) || a.hasAttribute("data-base-ui-focus-guard"))
        );
      });

    async function open(page: Page) {
      await trigger(page).focus();
      await page.keyboard.press("Enter");
      await expect(dialog(page)).toBeVisible();
      await page.waitForFunction(
        () =>
          getComputedStyle(document.querySelector(".orr-dialog")!).opacity ===
          "1",
      );
    }

    test("checkPattern dialog, transitions on and off", async ({ page }) => {
      for (const transitions of ["on", "off"]) {
        await page.goto(`/spike-ui-sdk.html?impl=${impl}`);
        if (transitions === "off")
          await page.addStyleTag({
            content: "*, *::before, *::after { transition: none !important; }",
          });
        await open(page);
        const problems = await patternProblems(page, "body");
        console.log(
          `[checkPattern ${impl}, transitions ${transitions}] ${problems || "no problems"}`,
        );
      }
    });

    test("name, description, aria-modal, page behind hidden from assistive tech", async ({
      page,
    }) => {
      await open(page);
      await expect(dialog(page)).toHaveAccessibleDescription(
        "The new name shows on every chart.",
      );
      const facts = await page.evaluate(() => {
        const search = document.querySelector(
          'input[placeholder="Type to search"]',
        )!;
        return {
          ariaModal: document
            .querySelector('[role="dialog"]')!
            .getAttribute("aria-modal"),
          searchInert: search.closest("[inert]") !== null,
          searchAriaHidden: search.closest('[aria-hidden="true"]') !== null,
        };
      });
      console.log(`[a11y ${impl}] ${JSON.stringify(facts)}`);
      expect(facts.searchInert || facts.searchAriaHidden).toBe(true);
    });

    test("focus moves in on open, Tab and Shift+Tab stay inside", async ({
      page,
    }) => {
      await open(page);
      await expect.poll(() => inside(page)).toBe(true);
      const first = await page.evaluate(
        () =>
          document.activeElement?.getAttribute("aria-label") ??
          document.activeElement?.textContent,
      );
      console.log(`[initial focus ${impl}] ${first}`);
      for (const key of [
        ...Array(6).fill("Tab"),
        ...Array(6).fill("Shift+Tab"),
      ]) {
        await page.keyboard.press(key);
        await expect.poll(() => inside(page), { timeout: 1000 }).toBe(true);
      }
    });

    test("Escape closes, focus returns to the trigger", async ({ page }) => {
      await open(page);
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toBeHidden();
      await expect(trigger(page)).toBeFocused();
    });

    test("a Close part closes, focus returns to the trigger", async ({
      page,
    }) => {
      await open(page);
      await dialog(page).getByRole("button", { name: "Cancel" }).click();
      await expect(dialog(page)).toBeHidden();
      await expect(trigger(page)).toBeFocused();
    });

    test("an outside press closes", async ({ page }) => {
      await open(page);
      await page.mouse.click(4, 4);
      await expect(dialog(page)).toBeHidden();
      const focus = await page.evaluate(
        () => document.activeElement?.textContent,
      );
      console.log(`[focus after outside press ${impl}] ${focus}`);
    });

    test("scroll lock: the page does not scroll while open, and keeps its place after", async ({
      page,
    }) => {
      await trigger(page).scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => scrollY);
      expect(before).toBeGreaterThan(0);
      await open(page);
      await page.mouse.move(4, 4);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => scrollY)).toBe(before);
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toBeHidden();
      expect(await page.evaluate(() => scrollY)).toBe(before);
    });

    test("portal: the popup renders outside the app root", async ({ page }) => {
      await open(page);
      const chain = await page.evaluate(() => {
        const out: string[] = [];
        for (
          let e: Element | null = document.querySelector('[role="dialog"]');
          e;
          e = e.parentElement
        )
          out.push(
            e.id
              ? `${e.tagName.toLowerCase()}#${e.id}`
              : e.tagName.toLowerCase(),
          );
        return out;
      });
      console.log(`[portal ${impl}] ${chain.join(" < ")}`);
      expect(chain).not.toContain("div#root");
    });

    test("stacking: the popup is above a page element with the highest z-index", async ({
      page,
    }) => {
      await page.addStyleTag({
        content:
          "#cover { position: fixed; inset: 0; z-index: 2147483647; background: transparent; }",
      });
      await page.evaluate(() => {
        const c = document.createElement("div");
        c.id = "cover";
        document.getElementById("root")!.append(c);
      });
      await trigger(page).focus();
      await page.keyboard.press("Enter");
      await expect(dialog(page)).toBeAttached();
      const onTop = await dialog(page).evaluate((d) => {
        const r = d.getBoundingClientRect();
        return d.contains(
          document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2),
        );
      });
      console.log(`[stacking ${impl}] popup on top of z-index max: ${onTop}`);
      // A known difference, pinned: Base UI stacks by z-index (--orr-z-overlay), so a page
      // element above it covers the popup; UI SDK's top layer is above every z-index.
      expect(onTop).toBe(impl === "sdk");
    });

    test("nested: Escape closes only the inner dialog, focus returns to the inner trigger", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Open settings" }).click();
      const outer = page.getByRole("dialog", { name: "Orbit settings" });
      await expect(outer).toBeVisible();
      const innerTrigger = outer.getByRole("button", { name: "Delete orbit" });
      await innerTrigger.focus();
      await page.keyboard.press("Enter");
      const inner = page.getByRole("dialog", { name: "Delete orbit?" });
      await expect(inner).toBeVisible();
      await expect(inner).toHaveAttribute("data-nested", "");
      expect(
        await inner.evaluate((d) => {
          const r = d.getBoundingClientRect();
          return d.contains(
            document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2,
            ),
          );
        }),
      ).toBe(true);
      await page.keyboard.press("Escape");
      await expect(inner).toBeHidden();
      await expect(outer).toBeVisible();
      await expect(innerTrigger).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(outer).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Open settings" }),
      ).toBeFocused();
    });

    test("reduced motion: opens with opacity only; with motion allowed, the popup scales", async ({
      page,
    }) => {
      for (const reducedMotion of ["reduce", "no-preference"] as const) {
        await page.goto(`/spike-ui-sdk.html?impl=${impl}`);
        await page.emulateMedia({ reducedMotion });
        await page.evaluate(() => {
          const w = window as unknown as { seen: string[] };
          w.seen = [];
          // Samples for 600ms from the frame the popup first appears (the machine is loaded).
          let t0 = 0;
          const tick = () => {
            const el = document.querySelector(".orr-dialog");
            if (el) {
              t0 ||= performance.now();
              w.seen.push(getComputedStyle(el).transform);
            }
            if (!t0 || performance.now() - t0 < 600)
              requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();
        await page.waitForTimeout(700);
        const seen = await page.evaluate(
          () => (window as unknown as { seen: string[] }).seen,
        );
        expect(seen.length).toBeGreaterThan(0);
        const moved = seen.some((t) => t !== "none");
        console.log(
          `[motion ${impl} ${reducedMotion}] frames ${seen.length}, transformed ${moved}`,
        );
        expect(moved).toBe(reducedMotion === "no-preference");
      }
    });

    test("axe (WCAG 2.2 AA) on the open dialog", async ({ page }) => {
      const { default: AxeBuilder } = await import("@axe-core/playwright");
      await open(page);
      const r = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .exclude("[data-base-ui-focus-guard]")
        .analyze();
      expect(r.violations.map((v) => v.id)).toEqual([]);
    });
  });
}
