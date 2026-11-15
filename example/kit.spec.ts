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
// Live dialogs portal to one wrapper per panel at the end of <body>; the static
// open-state specimens portal into their frame inside the panel.
const LIVE_POPUP = ".spec-portals .orr-dialog";
const STATIC_POPUP = ".spec-dialog-frame .orr-dialog";

test.beforeEach(async ({ page }) => {
  // The specimen links Google Fonts for brand solar; never touch the network in a test.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
  await page.goto("/kit.html");
  // The three static dialogs have faded in.
  await page.waitForFunction((sel) => {
    const popups = [...document.querySelectorAll(sel)];
    return (
      popups.length === 3 &&
      popups.every((p) => getComputedStyle(p).opacity === "1")
    );
  }, STATIC_POPUP);
});

const panel = (page: Page, id: string) => page.locator(`[data-panel="${id}"]`);
const trigger = (p: Locator) => p.getByRole("button", { name: "Rename orbit" });

/** axe over a panel and its live-dialog portal. */
async function violations(page: Page, id: string) {
  // Base UI's focus-guard sentinels (aria-hidden, tabbable, they only bounce focus) are
  // excluded, per the precedent in axe.spec.ts. Every other node is scanned.
  const scope = (b: AxeBuilder) =>
    b
      .include(`[data-panel="${id}"]`)
      .include(`[data-portal-for="${id}"]`)
      .exclude("[data-base-ui-focus-guard]");
  const wcag = await scope(new AxeBuilder({ page })).withTags(TAGS).analyze();
  const labelInName = await scope(new AxeBuilder({ page }))
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
    // The panel, or the panel's live-dialog portal: both carry its brand and mode.
    const root = el.closest("[data-brand]") as HTMLElement;
    const owner =
      root.getAttribute("data-panel") ?? root.getAttribute("data-portal-for");
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
      inPanel: owner === id,
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
      expect(await violations(page, id)).toEqual([]);
    });

    test("axe: no violations with the live dialog open", async ({ page }) => {
      await openLive(page, panel(page, id));
      expect(await violations(page, id)).toEqual([]);
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
      const inside = () =>
        dialog.evaluate((d) => d.contains(document.activeElement));
      expect(await inside()).toBe(true);
      // Record every element that takes focus. Base UI wraps focus through an aria-hidden
      // focus-guard span (one async hop), so the guard and <body> may hold focus for a moment;
      // nothing else outside the popup may ever take it.
      await dialog.evaluate((d) => {
        const w = window as unknown as { escaped: string[] };
        w.escaped = [];
        document.addEventListener(
          "focusin",
          (e) => {
            const t = e.target as HTMLElement;
            if (d.contains(t) || t.hasAttribute("data-base-ui-focus-guard"))
              return;
            w.escaped.push(t.outerHTML.slice(0, 80));
          },
          true,
        );
      });
      // Four tabbables inside (close, name, Cancel, Save): six presses each way wrap past both ends.
      for (const key of [
        ...Array(6).fill("Tab"),
        ...Array(6).fill("Shift+Tab"),
      ]) {
        await page.keyboard.press(key);
        await expect.poll(inside, { timeout: 1000 }).toBe(true);
      }
      expect(
        await page.evaluate(
          () => (window as unknown as { escaped: string[] }).escaped,
        ),
      ).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger(p)).toBeFocused();
    });

    test("Dialog: Space opens on top of the page, an outside press closes", async ({
      page,
    }) => {
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
        // The dense row is measured by its own test below: there the 44px areas abut by design.
        .locator(".orr-button:not([data-preview~='active']):not(.spec-dense *)")
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

    test("hit area, dense row: at the documented gap each size-s button's centre and edges press that button, not a neighbour", async ({
      page,
    }) => {
      const row = panel(page, id).locator(".spec-dense");
      expect(await denseRowThefts(row)).toEqual([]);
    });
  });
}

/**
 * Presses 1px inside each edge, and the centre, of every button in a row (elementFromPoint, the
 * same hit test a pointer uses) and lists every point that lands on another button.
 */
function denseRowThefts(row: Locator) {
  return row.evaluate((r) => {
    r.scrollIntoView({ block: "center" });
    const out: string[] = [];
    const buttons = [...r.querySelectorAll<HTMLElement>(".orr-button")];
    buttons.forEach((el, i) => {
      const b = el.getBoundingClientRect();
      const cy = b.top + b.height / 2;
      const cx = b.left + b.width / 2;
      const points: Array<[string, number, number]> = [
        ["centre", cx, cy],
        ["left edge", b.left + 1, cy],
        ["right edge", b.right - 1, cy],
        ["top edge", cx, b.top + 1],
        ["bottom edge", cx, b.bottom - 1],
        // 21px out from the centre on each side: inside its own 44px area, 1px short of where it meets a neighbour's at --space-12.
        ["reach left", cx - 21, cy],
        ["reach right", cx + 21, cy],
        ["reach up", cx, cy - 21],
        ["reach down", cx, cy + 21],
      ];
      for (const [where, x, y] of points) {
        const hit = document.elementFromPoint(x, y)?.closest(".orr-button");
        if (hit !== el)
          out.push(
            `button ${i} ${where} -> ${hit ? `button ${buttons.indexOf(hit as HTMLElement)}` : "nothing"}`,
          );
      }
    });
    return out;
  });
}

test("hit area, dense row red-proof: under the documented gap (--space-4) a neighbour takes presses", async ({
  page,
}) => {
  const row = panel(page, "orrery-light").locator(".spec-dense");
  await row.evaluate((r) => (r.style.gap = "var(--space-4)"));
  expect((await denseRowThefts(row)).length).toBeGreaterThan(0);
});

test("cascade layer: a consumer's single-class rule beats every kit rule, whatever the kit's specificity", async ({
  page,
}) => {
  // The focus-preview primary Button is styled by .orr-button:is(:focus-visible, [data-preview~="focus"]).
  const button = panel(page, "orrery-light")
    .locator("tbody tr")
    .filter({ hasText: /^focus/i })
    .locator(".orr-button")
    .first();
  await page.addStyleTag({
    content: ".consumer { outline-width: 5px; border-radius: 0; }",
  });
  await button.evaluate((el) => el.classList.add("consumer"));
  expect(
    await button.evaluate((el) => {
      const cs = getComputedStyle(el);
      return [cs.outlineWidth, cs.borderTopLeftRadius];
    }),
  ).toEqual(["5px", "0px"]);
});

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
      opened: boolean;
    };
    w.seen = [];
    w.opened = false;
    // Sample every frame until the popup has fully opened: opacity 1 and no transition left running.
    const tick = () => {
      const el = document.querySelector(sel);
      if (el) {
        const cs = getComputedStyle(el);
        w.seen.push(cs.transform);
        w.transitionProperty = cs.transitionProperty;
        if (cs.opacity === "1" && el.getAnimations().length === 0) {
          w.opened = true;
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, LIVE_POPUP);
  await trigger(panel(page, id)).click();
  await page.waitForFunction(
    () => (window as unknown as { opened: boolean }).opened,
  );
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

test.describe("Dialog edge cases (fixtures/kit-dialog.html)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fixtures/kit-dialog.html");
  });

  test("portal: with no container, an open dialog's portal node is a direct child of <body>", async ({
    page,
  }) => {
    // The specimen's live dialogs pass a container (a per-panel wrapper that carries the brand), so
    // this is checked here, on Dialog.Popup's default, which is what an app gets.
    await page.getByRole("button", { name: "Open settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Orbit settings" });
    await expect(dialog).toBeVisible();
    expect(
      await dialog.evaluate((d) => {
        const portal = d.closest("[data-base-ui-portal]");
        return portal?.parentElement?.tagName ?? "no portal";
      }),
    ).toBe("BODY");
  });

  test("nested dialog: opens above its parent, Escape closes only the inner one, focus returns to the inner trigger", async ({
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
    // Above: the inner popup's centre hits the inner popup, not the outer one.
    expect(
      await inner.evaluate((d) => {
        const r = d.getBoundingClientRect();
        return d.contains(
          document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2),
        );
      }),
    ).toBe(true);
    await expect
      .poll(() => inner.evaluate((d) => d.contains(document.activeElement)))
      .toBe(true);
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

  test("trigger unmounts while open: no error, the dialog closes, focus lands on <body>", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.getByRole("button", { name: "Edit orbit" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit orbit" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Remove the trigger" }).click();
    await expect(page.getByText("The trigger is gone.")).toBeVisible();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // Base UI returns focus to the trigger; with the trigger gone it falls back to <body>.
    // Recorded as Base UI's behaviour, not changed here: a consumer that removes the trigger
    // should pass Dialog.Popup finalFocus.
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
      "BODY",
    );
    expect(errors).toEqual([]);
  });
});

test.describe("golden examples (fixtures/kit-examples.html)", () => {
  test("every example in kit/catalog.json mounts, with no console error and no axe violation", async ({
    page,
  }) => {
    const { readFileSync } = await import("node:fs");
    const catalog = JSON.parse(
      readFileSync(new URL("../kit/catalog.json", import.meta.url), "utf8"),
    ) as { components: Record<string, { example: { file: string } }> };
    const files = [
      ...new Set(Object.values(catalog.components).map((c) => c.example.file)),
    ].sort();
    expect(files.length).toBeGreaterThan(0);

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("/fixtures/kit-examples.html");

    const sections = page.locator("[data-example]");
    await expect(sections).toHaveCount(files.length);
    const mounted = await sections.evaluateAll((els) =>
      els.map((el) => ({
        file: el.getAttribute("data-example"),
        children: el.childElementCount,
      })),
    );
    expect(mounted.map((m) => m.file).sort()).toEqual(files);
    for (const m of mounted) expect(m.children, m.file ?? "").toBeGreaterThan(0);

    const scope = (b: AxeBuilder) =>
      b.include("main").exclude("[data-base-ui-focus-guard]");
    const wcag = await scope(new AxeBuilder({ page })).withTags(TAGS).analyze();
    const labelInName = await scope(new AxeBuilder({ page }))
      .withRules(["label-content-name-mismatch"])
      .analyze();
    expect(
      [...wcag.violations, ...labelInName.violations].map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target.join(" ")),
      })),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("Field example: its error state shows the error text, and the input is described by it", async ({
    page,
  }) => {
    await page.goto("/fixtures/kit-examples.html");
    const field = page.locator('[data-example="kit/field/Field.example.tsx"]');
    const email = field.getByRole("textbox", { name: "Email" });
    await expect(email).toHaveAttribute("aria-invalid", "true");
    const error = field.getByText("Add the part after the @");
    await expect(error).toBeVisible();
    const errorId = await error.getAttribute("id");
    expect(errorId).toBeTruthy();
    expect((await email.getAttribute("aria-describedby"))?.split(" ")).toContain(
      errorId,
    );
  });
});
