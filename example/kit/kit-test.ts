import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Shared helpers for the kit behaviour suites: example/kit.spec.ts and every
 * example/kit/<name>.kit.spec.ts. A suite on the specimen page starts with
 *
 *   test.beforeEach(({ page }) => openSpecimen(page));
 *
 * and runs its checks once per panel in PANELS. The panel-wide axe test in kit.spec.ts
 * already scans every specimen block, so a new block is covered by axe with no new test.
 */

export const PANELS = ["orrery-light", "orrery-dark", "solar"] as const;
export const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
// Live dialogs portal to one wrapper per panel at the end of <body>; the static
// open-state specimens portal into their frame inside the panel.
export const LIVE_POPUP = ".spec-portals .orr-dialog";
export const STATIC_POPUP = ".spec-dialog-frame .orr-dialog";

/** Loads the specimen page, network-free, and waits until the three static dialogs have faded in. */
export async function openSpecimen(page: Page) {
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
}

export const panel = (page: Page, id: string) =>
  page.locator(`[data-panel="${id}"]`);

/** axe over a panel and its live-dialog portal. */
export async function violations(page: Page, id: string) {
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

/** The focused element's ring: style, width and colour, against the panel's own tokens, and whether any clipping ancestor cuts it. */
export async function focusRing(page: Page, panelId: string) {
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

export function expectRing(ring: Awaited<ReturnType<typeof focusRing>>) {
  expect(ring.inPanel).toBe(true);
  expect(ring.style).toBe("solid");
  expect(ring.ringWidth).toBe("2px");
  expect(ring.width).toBe(ring.ringWidth);
  expect(ring.offset).toBe(ring.ringWidth);
  expect(ring.color).toBe(ring.accent);
  expect(ring.clippedBy).toEqual([]);
}
