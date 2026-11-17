import { test, expect } from "@playwright/test";
import { LIVE_POPUP, openSpecimen, panel, PANELS } from "./kit-test";
import { patternProblems, transitionsOff } from "./check-pattern";

/**
 * The kit Dialog against UI SDK's checkPattern(root, "dialog"), the WAI-ARIA modal dialog
 * pattern: name, aria-modal, focus moved in, Tab and Shift+Tab wrap, Escape closes, focus back
 * to the trigger. Transitions off, so the check reads the DOM after each key without waiting
 * out the exit fade.
 */

test.beforeEach(({ page }) => openSpecimen(page));

for (const id of PANELS) {
  test(`${id}: the live dialog passes checkPattern "dialog" and is aria-modal`, async ({
    page,
  }) => {
    await transitionsOff(page);
    await panel(page, id).getByRole("button", { name: "Rename orbit" }).focus();
    await page.keyboard.press("Enter");
    const dialog = page
      .getByRole("dialog", { name: "Rename orbit" })
      .and(page.locator(LIVE_POPUP));
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(
      await patternProblems(page, `[data-portal-for="${id}"]`, "dialog"),
    ).toBe("");
  });
}
