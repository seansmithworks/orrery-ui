import { test, expect } from "@playwright/test";
import {
  PANELS,
  panel,
  openSpecimen,
  violations,
  focusRing,
  expectRing,
} from "./kit-test";

test.beforeEach(({ page }) => openSpecimen(page));

for (const id of PANELS) {
  test.describe(`Textarea, panel ${id}`, () => {
    const block = (page: import("@playwright/test").Page) =>
      panel(page, id).locator('[data-block="Textarea"]');
    const cell = (page: import("@playwright/test").Page, name: string) =>
      block(page).locator(`[data-cell="${name}"]`);

    test("label, description and error are wired to the textarea", async ({
      page,
    }) => {
      const rest = cell(page, "rest").getByRole("textbox");
      await expect(rest).toHaveAccessibleName("Note");
      await expect(rest).toHaveAccessibleDescription("We read every note.");
      expect(await rest.evaluate((el) => el.tagName)).toBe("TEXTAREA");
      // Typing works.
      await rest.fill("It stalls.");
      await expect(rest).toHaveValue("It stalls.");
      await expect(rest).toHaveAttribute("data-filled", "");
    });

    test("invalid: aria-invalid is set and the error describes the textarea", async ({
      page,
    }) => {
      const invalid = cell(page, "invalid").getByRole("textbox");
      await expect(invalid).toHaveAttribute("aria-invalid", "true");
      await expect(invalid).toHaveAttribute("data-invalid", "");
      await expect(invalid).toHaveAccessibleDescription(
        /Say what you clicked and what you expected\./,
      );
    });

    test("disabled and read-only", async ({ page }) => {
      await expect(cell(page, "disabled").getByRole("textbox")).toBeDisabled();
      await expect(
        cell(page, "read-only").getByRole("textbox"),
      ).not.toBeEditable();
    });

    test("focus: the one ring, and nothing clips it", async ({ page }) => {
      await cell(page, "rest").getByRole("textbox").focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      expectRing(await focusRing(page, id));
    });

    test("axe: no violations in any state", async ({ page }) => {
      const found = await violations(page, id);
      expect(found).toEqual([]);
    });

    test("hit area: every textarea is at least 44px tall", async ({ page }) => {
      const heights = await block(page)
        .locator(".orr-textarea")
        .evaluateAll((els) =>
          els.map((el) => el.getBoundingClientRect().height),
        );
      expect(heights).toHaveLength(7);
      expect(heights.every((h) => h >= 44)).toBe(true);
    });
  });
}
