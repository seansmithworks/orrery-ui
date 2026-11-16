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
 * checkbox.kit.spec.ts: the Checkbox block on the specimen page, once per brand panel.
 * Role and name, keyboard and label toggling, mixed state, disabled, focus ring, invalid
 * wiring, hit area, axe.
 */

test.beforeEach(({ page }) => openSpecimen(page));

const cell = (page: Page, id: string, name: string) =>
  panel(page, id).locator(`[data-block="Checkbox"] [data-cell="${name}"]`);
const box = (page: Page, id: string, name: string) =>
  cell(page, id, name).getByRole("checkbox");

for (const id of PANELS) {
  test.describe(`panel ${id}`, () => {
    test("Checkbox: role checkbox, named by its label, described by its hint", async ({
      page,
    }) => {
      const unchecked = box(page, id, "unchecked");
      await expect(unchecked).toHaveAccessibleName(
        "Email me when an orbit changes",
      );
      await expect(unchecked).toHaveAccessibleDescription(
        "At most one email a day.",
      );
      await expect(unchecked).toHaveAttribute("aria-checked", "false");
      await expect(box(page, id, "checked")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(
        panel(page, id).locator('[data-block="Checkbox"] [role="checkbox"]'),
      ).toHaveCount(8);
    });

    test("Checkbox: Space toggles, Enter does not", async ({ page }) => {
      const b = box(page, id, "unchecked");
      await b.focus();
      await page.keyboard.press("Space");
      await expect(b).toHaveAttribute("aria-checked", "true");
      await page.keyboard.press("Enter");
      await expect(b).toHaveAttribute("aria-checked", "true");
      await page.keyboard.press("Space");
      await expect(b).toHaveAttribute("aria-checked", "false");
    });

    test("Checkbox: a press on the label text toggles it, once", async ({
      page,
    }) => {
      const b = box(page, id, "unchecked");
      const label = cell(page, id, "unchecked").locator("label");
      // Press the label well to the right of the box and its hit area: the text, not the control.
      const r = await label.boundingBox();
      expect(r).not.toBeNull();
      await label.click({ position: { x: r!.width - 8, y: r!.height / 2 } });
      await expect(b).toHaveAttribute("aria-checked", "true");
      await label.click({ position: { x: r!.width - 8, y: r!.height / 2 } });
      await expect(b).toHaveAttribute("aria-checked", "false");
      // A press on the box itself toggles once too (the label does not toggle it a second time).
      await b.click();
      await expect(b).toHaveAttribute("aria-checked", "true");
    });

    test('Checkbox: indeterminate exposes aria-checked="mixed" and draws the dash, not the tick', async ({
      page,
    }) => {
      const b = box(page, id, "indeterminate");
      await expect(b).toHaveAttribute("aria-checked", "mixed");
      await expect(b).toHaveAttribute("data-indeterminate", "");
      await expect(b.locator(".orr-checkbox__dash")).toBeVisible();
      await expect(b.locator(".orr-checkbox__tick")).toBeHidden();
      await expect(
        box(page, id, "checked").locator(".orr-checkbox__tick"),
      ).toBeVisible();
      await expect(
        box(page, id, "checked").locator(".orr-checkbox__dash"),
      ).toBeHidden();
    });

    test("Checkbox: disabled does not toggle by press, label press or keyboard, and is not in the tab order", async ({
      page,
    }) => {
      for (const [name, state] of [
        ["disabled", "false"],
        ["disabled checked", "true"],
      ] as const) {
        const b = box(page, id, name);
        await expect(b).toBeDisabled();
        await expect(b).toHaveAttribute("aria-checked", state);
        await b.click({ force: true });
        await cell(page, id, name).locator("label").click({ force: true });
        await expect(b).toHaveAttribute("aria-checked", state);
        expect(await b.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
        await b.focus();
        await page.keyboard.press("Space");
        await expect(b).toHaveAttribute("aria-checked", state);
      }
    });

    test("Checkbox: focus ring is --ring-width solid --accent, offset, never clipped", async ({
      page,
    }) => {
      for (const name of ["unchecked", "checked", "indeterminate"]) {
        const b = box(page, id, name);
        await b.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        await expect(b).toBeFocused();
        expectRing(await focusRing(page, id));
      }
    });

    test("Checkbox: invalid is wired to the box: aria-invalid, data-invalid, the error in its description", async ({
      page,
    }) => {
      const b = box(page, id, "invalid");
      await expect(b).toHaveAttribute("aria-invalid", "true");
      await expect(b).toHaveAttribute("data-invalid", "");
      await expect(b).toHaveAttribute("aria-required", "true");
      await expect(b).toHaveAccessibleName(
        "I understand this cannot be undone",
      );
      await expect(b).toHaveAccessibleDescription(/Tick this box to confirm\./);
      // The valid boxes are not marked.
      await expect(box(page, id, "unchecked")).not.toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    test("Checkbox: the box draws small and answers a press 22px from its centre", async ({
      page,
    }) => {
      const result = await panel(page, id)
        .locator('[data-block="Checkbox"] .orr-checkbox')
        .evaluateAll((els) => {
          const out: string[] = [];
          for (const el of els) {
            el.scrollIntoView({ block: "center", inline: "center" });
            const r = el.getBoundingClientRect();
            if (r.width >= 44 || r.height >= 44)
              out.push(`drawn ${r.width}x${r.height}, expected under 44`);
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
                document.elementFromPoint(x, y)?.closest(".orr-checkbox") !== el
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
      expect(result.count).toBe(8);
      expect(result.out).toEqual([]);
    });

    test("Checkbox: a press in the hit area outside the drawn box toggles it", async ({
      page,
    }) => {
      const b = box(page, id, "unchecked");
      const r = await b.boundingBox();
      expect(r).not.toBeNull();
      // 20px left of the centre: outside the drawn box, inside the 44px hit area.
      await b.click({ position: { x: r!.width / 2 - 20, y: r!.height / 2 } });
      await expect(b).toHaveAttribute("aria-checked", "true");
    });

    test("Checkbox: axe, no violations in the panel", async ({ page }) => {
      expect(await violations(page, id)).toEqual([]);
    });
  });
}
