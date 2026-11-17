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
// The open live dialog. Held-open popups live in their frames' own documents
// (example/kit/held-open-frame.tsx), so the page's document holds only live ones, wherever
// the library renders them (a portal, or in place in the top layer). data-open is the open
// state both Base UI and UI SDK set.
export const LIVE_POPUP = ".orr-dialog[data-open]";
/** The iframe of every held-open frame (example/kit/held-open-frame.tsx). */
export const HELD_FRAME = "iframe.spec-held__doc";
/**
 * A focus sentinel: an empty, aria-hidden element in the tab order whose only job is to bounce
 * focus back into a trap (Base UI's focus guards are these; UI SDK traps without them). axe
 * would flag it as aria-hidden-focus, and a focus-trap check sees it take focus for a moment.
 */
export const FOCUS_SENTINEL = '[aria-hidden="true"][tabindex="0"]:empty';

/**
 * In-page (Playwright serialises it, so it is self-contained): true when exactly `count`
 * elements match `popup` inside the held-open frames whose frame element matches `frame`, and
 * every one has faded in.
 */
export function heldPopupsShown(args: {
  frame: string;
  popup: string;
  count: number;
}) {
  const popups = [
    ...document.querySelectorAll(`${args.frame} iframe.spec-held__doc`),
  ].flatMap((f) => [
    ...((f as HTMLIFrameElement).contentDocument?.querySelectorAll(
      args.popup,
    ) ?? []),
  ]);
  return (
    popups.length === args.count &&
    popups.every(
      (p) => p.ownerDocument.defaultView!.getComputedStyle(p).opacity === "1",
    )
  );
}

/** Loads the specimen page, network-free, and waits until the three static dialogs have faded in. */
export async function openSpecimen(page: Page) {
  // The specimen links Google Fonts for brand solar; never touch the network in a test.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
  await page.goto("/kit.html");
  await page.waitForFunction(heldPopupsShown, {
    frame: ".spec-dialog-frame",
    popup: ".orr-dialog",
    count: 3,
  });
}

export const panel = (page: Page, id: string) =>
  page.locator(`[data-panel="${id}"]`);

/** The panel, then the <body> of every held-open frame in it: one locator per document. */
export async function panelScopes(page: Page, id: string) {
  const frames = panel(page, id).locator(HELD_FRAME);
  const scopes = [panel(page, id)];
  for (let i = 0; i < (await frames.count()); i++)
    scopes.push(frames.nth(i).contentFrame().locator("body"));
  return scopes;
}

/** axe over a panel and its live-dialog portal. */
export async function violations(page: Page, id: string) {
  // Focus sentinels (FOCUS_SENTINEL) are excluded, per the precedent in axe.spec.ts. Every
  // other node is scanned, the held-open frames' documents included.
  const scope = (b: AxeBuilder) =>
    b
      .include(`[data-panel="${id}"]`)
      .include(`[data-portal-for="${id}"]`)
      .exclude(FOCUS_SENTINEL);
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
