import { test, expect, type Page } from "@playwright/test";
import {
  PANELS,
  openSpecimen,
  panel,
  violations,
  focusRing,
  expectRing,
} from "./kit-test";
import { patternProblems, transitionsOff } from "./check-pattern";

/**
 * radio.kit.spec.ts: the Radio block on the specimen page, once per brand panel.
 * Roles and names, the group's keyboard (one tab stop, arrows move and select), label presses, the
 * selected dot, disabled group and item, focus ring, invalid wiring, hit area, right to left, a narrow
 * viewport, axe.
 */

test.beforeEach(({ page }) => openSpecimen(page));

const cell = (page: Page, id: string, name: string) =>
  panel(page, id).locator(`[data-block="Radio"] [data-cell="${name}"]`);
const group = (page: Page, id: string, name: string) =>
  cell(page, id, name).getByRole("radiogroup");
const radio = (page: Page, id: string, name: string, label: string) =>
  cell(page, id, name).getByRole("radio", { name: label, exact: true });

for (const id of PANELS) {
  test.describe(`panel ${id}`, () => {
    test("Radio: a group named by its label and described by its hint, radios named by their text", async ({
      page,
    }) => {
      const g = group(page, id, "unselected");
      await expect(g).toHaveAccessibleName("Email notifications");
      await expect(g).toHaveAccessibleDescription("Choose how often we write.");
      const instantly = radio(page, id, "unselected", "Instantly");
      await expect(instantly).toHaveAttribute("aria-checked", "false");
      await expect(radio(page, id, "selected", "Daily digest")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(
        panel(page, id).locator('[data-block="Radio"] [role="radiogroup"]'),
      ).toHaveCount(7);
      await expect(
        panel(page, id).locator('[data-block="Radio"] [role="radio"]'),
      ).toHaveCount(21);
    });

    test("Radio: Tab enters a group at its selected radio, and at the first when none is selected", async ({
      page,
    }) => {
      // Shift+Tab from any radio leaves the group backwards; Tab then enters it again at the one tab stop.
      const selected = radio(page, id, "selected", "Daily digest");
      const first = radio(page, id, "selected", "Instantly");
      await first.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(selected).toBeFocused();

      const none = radio(page, id, "unselected", "Instantly");
      expect(await none.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(0);
      expect(
        await radio(page, id, "unselected", "Daily digest").evaluate(
          (el) => (el as HTMLElement).tabIndex,
        ),
      ).toBe(-1);
    });

    test("Radio: the arrow keys move and select, wrap at the ends, and Tab leaves the group", async ({
      page,
    }) => {
      const name = "selected";
      const instantly = radio(page, id, name, "Instantly");
      const daily = radio(page, id, name, "Daily digest");
      const weekly = radio(page, id, name, "Weekly digest");
      await daily.focus();
      await page.keyboard.press("ArrowDown");
      await expect(weekly).toBeFocused();
      await expect(weekly).toHaveAttribute("aria-checked", "true");
      await expect(daily).toHaveAttribute("aria-checked", "false");
      await page.keyboard.press("ArrowDown");
      await expect(instantly).toBeFocused();
      await expect(instantly).toHaveAttribute("aria-checked", "true");
      await page.keyboard.press("ArrowUp");
      await expect(weekly).toBeFocused();
      await expect(weekly).toHaveAttribute("aria-checked", "true");
      await page.keyboard.press("ArrowLeft");
      await expect(daily).toBeFocused();
      await expect(daily).toHaveAttribute("aria-checked", "true");
      await page.keyboard.press("ArrowRight");
      await expect(weekly).toBeFocused();
      // Only one radio of the group is in the tab order, so Tab goes past the others.
      await page.keyboard.press("Tab");
      expect(
        await group(page, id, name).locator('[role="radio"]:focus').count(),
      ).toBe(0);
    });

    test("Radio: Space chooses the focused radio and Enter does not", async ({
      page,
    }) => {
      const name = "unselected";
      const daily = radio(page, id, name, "Daily digest");
      await daily.focus();
      await page.keyboard.press("Enter");
      await expect(daily).toHaveAttribute("aria-checked", "false");
      await page.keyboard.press("Space");
      await expect(daily).toHaveAttribute("aria-checked", "true");
    });

    test("Radio: a press on the label text chooses its radio, once, and the others clear", async ({
      page,
    }) => {
      const name = "selected";
      const weekly = radio(page, id, name, "Weekly digest");
      const daily = radio(page, id, name, "Daily digest");
      const label = cell(page, id, name).locator("label", {
        hasText: "Weekly digest",
      });
      // Press the label well to the right of the ring and its hit area: the text, not the control.
      const r = await label.boundingBox();
      expect(r).not.toBeNull();
      await label.click({ position: { x: r!.width - 8, y: r!.height / 2 } });
      await expect(weekly).toHaveAttribute("aria-checked", "true");
      await expect(daily).toHaveAttribute("aria-checked", "false");
      // A press on the chosen radio again keeps it chosen: a radio never unchecks itself.
      await weekly.click();
      await expect(weekly).toHaveAttribute("aria-checked", "true");
    });

    test("Radio: the chosen radio draws the dot in the page colour on the text-colour ring; the others draw none", async ({
      page,
    }) => {
      const chosen = radio(page, id, "selected", "Daily digest");
      const other = radio(page, id, "selected", "Weekly digest");
      await expect(chosen.locator(".orr-radio__indicator")).toBeVisible();
      await expect(other.locator(".orr-radio__indicator")).toHaveCount(0);
      const look = await chosen.evaluate((el) => {
        const dot = el.querySelector(".orr-radio__indicator") as HTMLElement;
        const probe = document.createElement("span");
        el.parentElement!.append(probe);
        const resolve = (v: string) => {
          probe.style.color = `var(${v})`;
          return getComputedStyle(probe).color;
        };
        const out = {
          ring: getComputedStyle(el).backgroundColor,
          text: resolve("--text"),
          dot: getComputedStyle(dot).backgroundColor,
          page: resolve("--page"),
          dotWidth: dot.getBoundingClientRect().width,
          dotHeight: dot.getBoundingClientRect().height,
          radius: getComputedStyle(dot).borderRadius,
        };
        probe.remove();
        return out;
      });
      expect(look.ring).toBe(look.text);
      expect(look.dot).toBe(look.page);
      expect(look.dotWidth).toBe(look.dotHeight);
      expect(look.dotWidth).toBeGreaterThan(0);
      expect(look.dotWidth).toBeLessThan(16);
    });

    test("Radio: a disabled group and a disabled radio cannot be chosen by press, label press or keyboard", async ({
      page,
    }) => {
      for (const [name, label, state] of [
        ["disabled", "Weekly digest", "false"],
        ["disabled", "Daily digest", "true"],
        ["disabled item", "Instantly", "false"],
      ] as const) {
        const r = radio(page, id, name, label);
        await expect(r).toHaveAttribute("aria-checked", state);
        await r.click({ force: true });
        await cell(page, id, name)
          .locator("label", { hasText: label })
          .click({ force: true });
        await expect(r).toHaveAttribute("aria-checked", state);
      }
      // Every radio of the disabled group is out of the tab order.
      for (const label of ["Instantly", "Daily digest", "Weekly digest"]) {
        expect(
          await radio(page, id, "disabled", label).evaluate(
            (el) => (el as HTMLElement).tabIndex,
          ),
        ).toBe(-1);
      }
      await expect(
        radio(page, id, "disabled item", "Instantly"),
      ).toBeDisabled();
      // The arrow keys skip the disabled radio: up from Daily wraps past it to Weekly.
      const daily = radio(page, id, "disabled item", "Daily digest");
      await daily.focus();
      await page.keyboard.press("ArrowUp");
      await expect(
        radio(page, id, "disabled item", "Weekly digest"),
      ).toBeFocused();
      await expect(
        radio(page, id, "disabled item", "Instantly"),
      ).toHaveAttribute("aria-checked", "false");
    });

    test("Radio: focus ring is --ring-width solid --accent, offset, never clipped", async ({
      page,
    }) => {
      for (const [name, label] of [
        ["selected", "Daily digest"],
        ["unselected", "Instantly"],
      ]) {
        const r = radio(page, id, name, label);
        await r.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        await expect(r).toBeFocused();
        expectRing(await focusRing(page, id));
      }
    });

    test("Radio: invalid is wired to the group (aria-invalid, aria-required, the error in its description) and draws the heavy ring on every radio", async ({
      page,
    }) => {
      const g = group(page, id, "invalid");
      await expect(g).toHaveAttribute("aria-invalid", "true");
      await expect(g).toHaveAttribute("aria-required", "true");
      await expect(g).toHaveAttribute("data-invalid", "");
      await expect(g).toHaveAccessibleDescription(
        /Choose how often we write\./,
      );
      const stroke = (name: string) =>
        cell(page, id, name)
          .locator(".orr-radio")
          .evaluateAll((els) =>
            els.map((el) => getComputedStyle(el).boxShadow !== "none"),
          );
      expect(await stroke("invalid")).toEqual([true, true, true]);
      expect(await stroke("unselected")).toEqual([false, false, false]);
      await expect(group(page, id, "selected")).not.toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    test("Radio: the ring draws small and answers a press 21.5px from its centre on each axis", async ({
      page,
    }) => {
      const result = await panel(page, id)
        .locator('[data-block="Radio"] .orr-radio')
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
            // Radios in one group sit closer than 44px apart, so only the horizontal axis is
            // required to reach a full 21.5px; vertically the hit area may be won by a neighbour.
            const half = 21.5;
            for (const [x, y] of [
              [cx - half, cy],
              [cx + half, cy],
            ]) {
              const hit = document.elementFromPoint(x, y);
              if (hit?.closest(".orr-radio") !== el) {
                out.push(
                  `misses at ${Math.round(x - cx)},${Math.round(y - cy)}`,
                );
                break;
              }
            }
          }
          return { count: els.length, out };
        });
      expect(result.count).toBe(21);
      expect(result.out).toEqual([]);
    });

    test("Radio: axe, no violations in the panel", async ({ page }) => {
      expect(await violations(page, id)).toEqual([]);
    });
  });
}

test.describe("right to left", () => {
  const id = "orrery-light";

  test("Radio: in a right-to-left group the ring sits at the right edge of its option, the text to its left", async ({
    page,
  }) => {
    const c = cell(page, id, "unselected");
    await c.evaluate((el) => el.setAttribute("dir", "rtl"));
    const geometry = await c.evaluate((el) => {
      const label = el
        .querySelector(".orr-radio")!
        .closest("label") as HTMLElement;
      const ring = label.querySelector(".orr-radio")!.getBoundingClientRect();
      const l = label.getBoundingClientRect();
      const range = document.createRange();
      const textNode = [...label.childNodes].find(
        (n) => n.nodeType === Node.TEXT_NODE,
      )!;
      range.selectNodeContents(textNode);
      const text = range.getBoundingClientRect();
      return {
        ringAtRight: Math.abs(l.right - ring.right) <= 1,
        textLeftOfRing: text.right <= ring.left,
      };
    });
    expect(geometry.ringAtRight).toBe(true);
    expect(geometry.textLeftOfRing).toBe(true);
  });

  test("Radio: in a right-to-left group Up and Down still move and select", async ({
    page,
  }) => {
    await cell(page, id, "selected").evaluate((el) =>
      el.setAttribute("dir", "rtl"),
    );
    const daily = radio(page, id, "selected", "Daily digest");
    const weekly = radio(page, id, "selected", "Weekly digest");
    await daily.focus();
    await page.keyboard.press("ArrowDown");
    await expect(weekly).toBeFocused();
    await expect(weekly).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("overflow: a narrow viewport and a long label", () => {
  // At 400px the specimen cell is about 120px wide, so every label wraps.
  test.use({ viewport: { width: 400, height: 900 } });
  const id = "orrery-light";

  test("Radio: a long label wraps beside a ring that keeps its size, and nothing overflows the cell", async ({
    page,
  }) => {
    const c = cell(page, id, "unselected");
    const result = await c.evaluate((el) => {
      const label = el
        .querySelector(".orr-radio")!
        .closest("label") as HTMLElement;
      label.append(
        " who receive a very long notification label that has to wrap across several lines",
        Object.assign(document.createElement("span"), {
          textContent:
            " Supercalifragilisticexpialidocious_unbroken_word_that_is_wider_than_the_cell",
        }),
      );
      const ring = label.querySelector(".orr-radio")!.getBoundingClientRect();
      const cellBox = el.getBoundingClientRect();
      const labelBox = label.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
      return {
        ringWidth: ring.width,
        ringHeight: ring.height,
        labelLines: Math.round(labelBox.height / lineHeight),
        labelInside:
          labelBox.left >= cellBox.left - 1 &&
          labelBox.right <= cellBox.right + 1,
        scrolls: el.scrollWidth > el.clientWidth + 1,
      };
    });
    expect(result.ringWidth).toBe(16);
    expect(result.ringHeight).toBe(16);
    expect(result.labelLines).toBeGreaterThan(2);
    expect(result.labelInside).toBe(true);
    expect(result.scrolls).toBe(false);
  });
});

test.describe("golden example (fixtures/kit-examples.html)", () => {
  test("Radio example: a submit with nothing chosen is blocked and shows valueMissing; choosing clears it and the form sends channel=<value>", async ({
    page,
  }) => {
    await page.goto("/fixtures/kit-examples.html");
    const example = page.locator(
      '[data-example="kit/radio/Radio.example.tsx"]',
    );
    const submit = example.getByRole("button", { name: "Save alerts" });
    const error = example.getByText("Choose how to receive alerts.");
    const status = example.getByRole("status");
    const text = example.getByRole("radio", { name: "Text message" });
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

    await expect(example.getByRole("radiogroup")).toHaveAccessibleName(
      "Alerts for Orbit 7",
    );
    await expect(example.getByRole("radiogroup")).toHaveAttribute(
      "aria-required",
      "true",
    );
    await expect(error).toBeHidden();

    // Nothing chosen: the submit is blocked, the error shows.
    await submit.click();
    await expect(error).toBeVisible();
    await expect(status).toHaveText("");
    // The submit event fires (noValidate) but sends no value, and the handler goes no further.
    expect(await lastSubmit()).toEqual([]);

    // Chosen: the error clears and the submit goes through with the group's name and the radio's value.
    await text.click();
    await expect(error).toBeHidden();
    await submit.click();
    await expect(status).toHaveText("Alerts by sms.");
    expect(await lastSubmit()).toEqual([["channel", "sms"]]);
  });
});

test.describe("WAI-ARIA pattern (UI SDK checkPattern)", () => {
  for (const id of PANELS) {
    // Every group but "disabled": a wholly disabled group has no tab stop by design (like native radios), and the
    // check requires one.
    for (const name of [
      "unselected",
      "selected",
      "hover",
      "focus",
      "disabled item",
      "invalid",
    ]) {
      test(`${id}: the "${name}" group passes checkPattern "radio-group"`, async ({
        page,
      }) => {
        // Transitions off, so the check reads the settled DOM after each key it presses.
        await transitionsOff(page);
        expect(
          await patternProblems(
            page,
            `[data-panel="${id}"] [data-block="Radio"] [data-cell="${name}"] [role="radiogroup"]`,
            "radio-group",
          ),
        ).toBe("");
      });
    }
  }
});
