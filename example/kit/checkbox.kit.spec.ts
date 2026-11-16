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

    test("Checkbox: the box draws small and answers a press 21.5px from its centre on each axis", async ({
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
            // 21.5, not 22: a point exactly 22px out sits on the 44px hit area's edge, where
            // elementFromPoint can land on either side; half a pixel in is unambiguously inside.
            const half = 21.5;
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

    test("Checkbox: a press above and left of the box, outside the box and its label, toggles it only through the ::after hit area", async ({
      page,
    }) => {
      const b = box(page, id, "unchecked");
      await b.scrollIntoViewIfNeeded();
      // 18px up and 18px left of the box's centre: 10px outside the 16px box on both axes,
      // inside the 44px hit area (22px each way), and outside the label's own box.
      const point = await b.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const l = el.closest("label")!.getBoundingClientRect();
        const x = r.left + r.width / 2 - 18;
        const y = r.top + r.height / 2 - 18;
        return {
          x,
          y,
          inBox: x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
          inLabel: x >= l.left && x <= l.right && y >= l.top && y <= l.bottom,
        };
      });
      expect(point.inBox).toBe(false);
      expect(point.inLabel).toBe(false);

      // Red proof: with the ::after removed, the same press toggles nothing.
      const style = await page.addStyleTag({
        content: ".orr-checkbox::after { content: none !important; }",
      });
      await page.mouse.click(point.x, point.y);
      await expect(b).toHaveAttribute("aria-checked", "false");
      await style.evaluate((el) => el.remove());

      await page.mouse.click(point.x, point.y);
      await expect(b).toHaveAttribute("aria-checked", "true");
    });

    test("Checkbox: axe, no violations in the panel", async ({ page }) => {
      expect(await violations(page, id)).toEqual([]);
    });
  });
}

test.describe("golden example (fixtures/kit-examples.html)", () => {
  test("Checkbox example: a submit without the required tick is blocked and shows valueMissing; with it, the form sends understood=on", async ({
    page,
  }) => {
    await page.goto("/fixtures/kit-examples.html");
    const example = page.locator(
      '[data-example="kit/checkbox/Checkbox.example.tsx"]',
    );
    const understood = example.getByRole("checkbox", {
      name: "I understand this cannot be undone",
    });
    const submit = example.getByRole("button", { name: "Delete orbit" });
    const error = example.getByText("Tick this box to confirm.");
    const status = example.getByRole("status");
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

    await expect(understood).toHaveAttribute("aria-required", "true");
    await expect(error).toBeHidden();

    // Unticked: Base UI's Form blocks the submit, shows the valueMissing error and focuses the box.
    await submit.click();
    await expect(error).toBeVisible();
    await expect(understood).toHaveAttribute("aria-invalid", "true");
    await expect(understood).toHaveAccessibleDescription(
      /Tick this box to confirm\./,
    );
    await expect(understood).toBeFocused();
    await expect(status).toHaveText("");
    expect(await lastSubmit()).toEqual([["deleteCharts", "on"]]);

    // Ticked: the error clears and the submit goes through with the box's name and value.
    await understood.click();
    await expect(error).toBeHidden();
    await submit.click();
    await expect(status).toHaveText("Orbit 7 deleted.");
    expect(await lastSubmit()).toEqual([
      ["deleteCharts", "on"],
      ["understood", "on"],
    ]);
  });
});
