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
