import { test, expect, type Page } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareBlocks,
  readBlocks,
  splitByBlock,
  writeBlockPanel,
  type PanelData,
  type Props,
} from "./kit-baseline-store";

/**
 * kit-baseline.spec.ts: a computed-style lock on the kit specimen (example/kit.html),
 * the same idea as role-fallbacks.spec.ts. For every specimen cell in each of the three
 * panels (orrery light, orrery dark, solar) it records getComputedStyle for a fixed property
 * list on every element of the cell (and its ::before, ::after, ::placeholder), and compares
 * with the committed baseline: one file per specimen block, example/kit-baseline/<block>.json
 * (example/kit-baseline-store.ts). The live dialog is opened per panel and its scrim, viewport
 * and popup are recorded too, in block Live.
 *
 * The six exemplar blocks are read by their titles below. A block from
 * example/kit/specimens/*.specimen.tsx is read generically: each [data-cell] element is one
 * cell "<block>/<data-cell>", and its fixedSize selectors (data-fixed-width,
 * data-fixed-height on the block) add width and height (contract: example/kit/specimen.ts).
 * A block on the page with no baseline file fails.
 *
 * Why computed styles, not pixels: CI is Linux and development is macOS, so a pixel baseline
 * could not be shared. Computed values are platform-stable, with these exclusions:
 *  - Box geometry derived from text is not recorded. height is recorded on every element with no
 *    text in it (glyphs, the spinner, the scrim) and on the two elements whose height the kit
 *    declares in CSS: .orr-button (--hit-target-min, or --space-32 for size s) and .orr-input
 *    (--hit-target-min). width is recorded on text-free elements (icon buttons, glyphs, spinner,
 *    scrim) and the dialog popup, whose width comes from its own CSS. The input's width is a grid
 *    column sized by sibling text, so it is not recorded. Text buttons' width is text-derived.
 *  - The button's hit area (.orr-button::after) records top/right/bottom/left and height on every
 *    button, and width on icon buttons only: its width on a text button is text-derived.
 *  - margin-left and margin-right on the loading spinner: auto margins that resolve from the
 *    label's text width (found when CI on Linux disagreed with macOS by about 1px).
 *  - transform, translate, scale are not recorded: the loading spinner rotates, and the
 *    transform of a box can be derived from its measured size. The popup's enter scale is
 *    covered through transition-property and duration, and the spinner through animation-*.
 *  - Colours are normalised to rounded rgb()/rgba(), so color(srgb ...) results from
 *    color-mix do not depend on the Chromium build.
 *  - The brand fonts are not loaded (Google Fonts is stubbed). font-family records the declared
 *    stack, which is what the CSS decides; the face that paints is not part of the lock.
 * Not covered: layer membership (a kit rule moving out of @layer orrery.kit). Computed styles
 * cannot see it; the cascade-override test in kit.spec.ts owns it.
 * Hover, pressed and focus cells are forced by the specimen's data-preview hooks.
 *
 * Rewriting the baseline is explicit and names its blocks:
 * UPDATE_KIT_BASELINE=1 KIT_BASELINE_BLOCKS=<Name>[,<Name>] npm run test:kit-baseline rewrites
 * the named blocks; every other block is still compared and its file is not touched.
 * KIT_BASELINE_BLOCKS=* rewrites every block. UPDATE_KIT_BASELINE=1 alone fails and writes
 * nothing. Only the panels that ran are rewritten. Nothing else writes it; CI never sets it.
 *
 * Every run also writes what it recorded, in the committed format, to
 * <outputDir>/kit-baseline-actual/<block>.json. CI uploads that folder as the
 * kit-baseline-actual artifact when this gate fails, so a builder can commit a block's file
 * without running Chromium locally.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = resolve(HERE, "kit-baseline");
const UPDATE = process.env.UPDATE_KIT_BASELINE === "1";
const ONLY = process.env.KIT_BASELINE_BLOCKS
  ? process.env.KIT_BASELINE_BLOCKS.split(",").map((s) => s.trim())
  : null;

const PANELS = ["orrery-light", "orrery-dark", "solar"] as const;
const STATIC_POPUP = ".spec-dialog-frame .orr-dialog";

const PROPS = [
  "color",
  "background-color",
  "background-image",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "outline-color",
  "outline-width",
  "outline-style",
  "outline-offset",
  "box-shadow",
  "opacity",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "gap",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "box-sizing",
  "visibility",
  "overflow-x",
  "overflow-y",
  "align-items",
  "justify-content",
  "flex-direction",
  "white-space",
  "filter",
  "backdrop-filter",
  "text-shadow",
  "z-index",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-decoration-line",
  "text-decoration-style",
  "text-decoration-color",
  "cursor",
  "pointer-events",
  "transition-property",
  "transition-duration",
  "transition-timing-function",
  "transition-delay",
  "animation-name",
  "animation-duration",
  "animation-timing-function",
  "animation-iteration-count",
];

/** Runs in the page. Collects every cell of one panel, or of its live-dialog portal. */
function collectInPage(args: {
  panelId: string;
  portal: boolean;
  props: string[];
}): PanelData {
  const { panelId, portal, props } = args;
  const hash = (s: string) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
    return (h >>> 0).toString(16);
  };
  const norm = (v: string) =>
    v
      .replace(
        /color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)(?: \/ ([-\d.e]+))?\)/g,
        (_m, r, g, b, a) => {
          const c = (x: string) =>
            Math.max(0, Math.min(255, Math.round(Number(x) * 255)));
          const al = a === undefined ? 1 : Number(Number(a).toFixed(3));
          return al === 1
            ? `rgb(${c(r)}, ${c(g)}, ${c(b)})`
            : `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${al})`;
        },
      )
      .replace(
        /url\("data:[^"]*"\)/g,
        (m) => `data-url(${m.length}:${hash(m)})`,
      )
      .replace(/-?\d+\.\d+/g, (n) => String(Number(Number(n).toFixed(3))));

  const isSpecimen = (el: Element) =>
    [...el.classList].some((c) => c.startsWith("spec-"));
  const text = (el: Element | null) => (el?.textContent ?? "").trim();

  const read = (el: Element, pseudo?: string) => {
    const cs = getComputedStyle(el, pseudo);
    const out: Record<string, string> = {};
    for (const p of props) out[p] = norm(cs.getPropertyValue(p));
    return out;
  };

  const record = (root: Element, self: boolean): Record<string, Props> => {
    const all = [...(self ? [root] : []), ...root.querySelectorAll("*")].filter(
      (el) =>
        !el.closest(".spec-label, .spec-dialog-behind") &&
        !el.closest("[data-base-ui-focus-guard]") &&
        !(el !== root && isSpecimen(el)) &&
        !(
          el.namespaceURI?.endsWith("svg") && el.tagName.toLowerCase() !== "svg"
        ),
    );
    const out: Record<string, Props> = {};
    const counts = new Map<string, number>();
    const owner = root.closest("[data-block]");
    const fixedWidth = owner?.getAttribute("data-fixed-width");
    const fixedHeight = owner?.getAttribute("data-fixed-height");
    for (const el of all) {
      const orr = [...el.classList].find((c) => c.startsWith("orr-"));
      const base = `${el.tagName.toLowerCase()}${orr ? "." + orr : ""}`;
      const n = counts.get(base) ?? 0;
      counts.set(base, n + 1);
      const key = `${base}#${n}`;
      const vals = read(el);
      // Geometry only where text cannot move it: see the header of kit-baseline.spec.ts.
      const cs = getComputedStyle(el);
      const popup = el.classList.contains("orr-dialog");
      const button = el.classList.contains("orr-button");
      const input = el.classList.contains("orr-input");
      // The kit declares a fixed height on .orr-button and .orr-input, so it is recorded
      // even though the element holds text. Width is recorded for text-free elements (not the
      // input, whose width is a grid column sized by sibling text) and the popup.
      if ((!text(el) && !input) || popup) vals.width = norm(cs.width);
      if ((!text(el) && !popup) || button || input)
        vals.height = norm(cs.height);
      // A specimen file's fixedSize: the elements whose width or height its CSS declares.
      if (fixedWidth && el.matches(fixedWidth)) vals.width = norm(cs.width);
      if (fixedHeight && el.matches(fixedHeight)) vals.height = norm(cs.height);
      // The spinner centres with auto margins, which resolve from the label's text width.
      if (el.classList.contains("orr-button__spinner"))
        for (const m of ["margin-left", "margin-right"]) delete vals[m];
      out[key] = vals;
      for (const ps of ["::before", "::after"]) {
        const content = getComputedStyle(el, ps).getPropertyValue("content");
        if (content === "none" || content === "normal") continue;
        const pv: Record<string, string> = { content, ...read(el, ps) };
        // The button's hit area (inset: min(0px, (100% - hit-target) / 2)): its height is fixed
        // by the button's declared height; its width is fixed only on an icon button.
        if (button && ps === "::after") {
          const pcs = getComputedStyle(el, ps);
          pv.height = norm(pcs.height);
          if (el.hasAttribute("data-icon")) pv.width = norm(pcs.width);
        }
        out[`${key}${ps}`] = pv;
      }
      if (el.tagName === "INPUT")
        out[`${key}::placeholder`] = read(el, "::placeholder");
    }
    return out;
  };

  const data: PanelData = {};
  const add = (key: string, root: Element | null, self: boolean) => {
    if (!root) throw new Error(`kit baseline: no element for cell ${key}`);
    if (key in data) throw new Error(`kit baseline: duplicate cell key ${key}`);
    const cell = record(root, self);
    // An empty cell would lock nothing and pass whatever happens to it.
    if (!Object.keys(cell).length)
      throw new Error(`kit baseline: cell ${key} records no element`);
    data[key] = cell;
  };

  if (portal) {
    add(
      "Live/dialog open",
      document.querySelector(`[data-portal-for="${panelId}"]`),
      false,
    );
    return data;
  }

  const panel = document.querySelector(`[data-panel="${panelId}"]`)!;
  for (const block of panel.querySelectorAll(".spec-block")) {
    // A block from example/kit/specimens/: one cell per [data-cell] element.
    const name = block.getAttribute("data-block");
    if (name !== null) {
      const cells = block.querySelectorAll("[data-cell]");
      if (!cells.length)
        throw new Error(`kit baseline: block "${name}" has no [data-cell]`);
      for (const cell of cells) {
        // A nested cell would be recorded twice: once inside its parent, once on its own.
        if (cell.parentElement?.closest("[data-cell]"))
          throw new Error(
            `kit baseline: block "${name}" nests [data-cell="${cell.getAttribute("data-cell")}"] inside another cell`,
          );
        add(`${name}/${cell.getAttribute("data-cell")}`, cell, false);
      }
      continue;
    }
    const title = text(block.querySelector(".spec-block__title"));
    if (title === "Live") {
      add("Live/search field", block.querySelector(".spec-live__field"), false);
      add("Live/trigger", block.querySelector(".spec-live .orr-button"), true);
    } else if (title === "Button" || title === "IconButton") {
      const cols = [...block.querySelectorAll("thead th")].map(text);
      for (const row of block.querySelectorAll("tbody tr")) {
        const name = text(row.querySelector("th"));
        [...row.querySelectorAll("td")].forEach((td, i) =>
          add(`${title}/${name}/${cols[i]}`, td, false),
        );
      }
    } else if (title.startsWith("Dense row")) {
      for (const b of block.querySelectorAll(".spec-dense > *")) {
        const kind = b.hasAttribute("data-icon") ? "IconButton" : "Button";
        add(`Dense row/${kind} s/${b.getAttribute("data-variant")}`, b, true);
      }
    } else if (title === "Field") {
      for (const cell of block.querySelectorAll(".spec-cell"))
        add(`Field/${text(cell.querySelector(".spec-label"))}`, cell, false);
    } else if (title === "Dialog") {
      add(
        "Dialog/static open",
        block.querySelector(".spec-dialog-frame"),
        false,
      );
    } else {
      throw new Error(`kit baseline: unknown specimen block "${title}"`);
    }
  }
  return data;
}

async function collect(
  page: Page,
  panelId: string,
  portal: boolean,
): Promise<PanelData> {
  return page.evaluate(collectInPage, { panelId, portal, props: PROPS });
}

/** Re-snapshot until two reads 150ms apart are identical, so no transition is sampled mid-flight. */
async function settled(
  page: Page,
  panelId: string,
  portal: boolean,
): Promise<PanelData> {
  let prev = JSON.stringify(await collect(page, panelId, portal));
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const snap = await collect(page, panelId, portal);
    const cur = JSON.stringify(snap);
    if (cur === prev) return snap;
    prev = cur;
  }
  throw new Error("computed styles never settled within 6s");
}

function checkBaseline(panel: string, actual: PanelData, outputDir: string) {
  const blocks = splitByBlock(actual);
  // What this run recorded, for CI's kit-baseline-actual artifact.
  const actualDir = resolve(outputDir, "kit-baseline-actual");
  for (const [block, data] of Object.entries(blocks))
    writeBlockPanel(actualDir, block, panel, data);
  const { write, errors } = compareBlocks(
    panel,
    blocks,
    readBlocks(BASELINE_DIR),
    UPDATE,
    ONLY,
  );
  for (const block of write)
    writeBlockPanel(BASELINE_DIR, block, panel, blocks[block]);
  expect(errors).toEqual([]);
}

test.setTimeout(120_000);

for (const id of PANELS) {
  test(`kit specimen computed styles: ${id}`, async ({ page }, testInfo) => {
    // The specimen links Google Fonts for brand solar; never touch the network in a test.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
      route.fulfill({ contentType: "text/css", body: "" }),
    );
    await page.goto("/kit.html");
    await page.waitForFunction((sel) => {
      const popups = [...document.querySelectorAll(sel)];
      return (
        popups.length === 3 &&
        popups.every((p) => getComputedStyle(p).opacity === "1")
      );
    }, STATIC_POPUP);

    const data = await settled(page, id, false);

    // The live dialog, open: scrim, viewport and popup, in the panel's portal.
    const panel = page.locator(`[data-panel="${id}"]`);
    await panel.getByRole("button", { name: "Rename orbit" }).click();
    const live = ".spec-portals .orr-dialog";
    await page.waitForFunction(
      (sel) => getComputedStyle(document.querySelector(sel)!).opacity === "1",
      live,
    );
    Object.assign(data, await settled(page, id, true));

    checkBaseline(id, data, testInfo.project.outputDir);
  });
}
