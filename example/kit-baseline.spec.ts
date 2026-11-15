import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * kit-baseline.spec.ts: a computed-style lock on the kit specimen (example/kit.html),
 * the same idea as role-fallbacks.spec.ts. For every specimen cell in each of the three
 * panels (orrery light, orrery dark, solar) it records getComputedStyle for a fixed property
 * list on every element of the cell (and its ::before, ::after, ::placeholder), and compares
 * with the committed example/kit-baseline.json. The live dialog is opened per panel and its
 * scrim, viewport and popup are recorded too.
 *
 * Why computed styles, not pixels: CI is Linux and development is macOS, so a pixel baseline
 * could not be shared. Computed values are platform-stable, with these exclusions:
 *  - Box geometry derived from text (width, height) is recorded only for elements with no text
 *    in them (icon buttons, glyphs, the spinner, the scrim), plus the dialog popup's width,
 *    which comes from its own CSS and not from its content. Everything else sizes from fonts.
 *  - transform, translate, scale are not recorded: the loading spinner rotates, and the
 *    transform of a box can be derived from its measured size. The popup's enter scale is
 *    covered through transition-property and duration, and the spinner through animation-*.
 *  - Colours are normalised to rounded rgb()/rgba(), so color(srgb ...) results from
 *    color-mix do not depend on the Chromium build.
 *  - The brand fonts are not loaded (Google Fonts is stubbed). font-family records the declared
 *    stack, which is what the CSS decides; the face that paints is not part of the lock.
 * Hover, pressed and focus cells are forced by the specimen's data-preview hooks.
 *
 * Rewriting the baseline is explicit: UPDATE_KIT_BASELINE=1 npm run test:kit-baseline.
 * Only the panels that ran are rewritten. Nothing else writes it; CI never sets it.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = resolve(HERE, "kit-baseline.json");
const UPDATE = process.env.UPDATE_KIT_BASELINE === "1";

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

type Props = Record<string, string>;
type Cell = Record<string, Props>; // element key -> prop -> value
type PanelData = Record<string, Cell>; // cell key -> element
interface BaselineFile {
  panels: Record<string, PanelData>;
}

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
      if (!text(el) || popup) {
        vals.width = norm(cs.width);
        if (!popup) vals.height = norm(cs.height);
      }
      out[key] = vals;
      for (const ps of ["::before", "::after"]) {
        const content = getComputedStyle(el, ps).getPropertyValue("content");
        if (content === "none" || content === "normal") continue;
        out[`${key}${ps}`] = { content, ...read(el, ps) };
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
    data[key] = record(root, self);
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

function flatten(data: PanelData): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [cell, els] of Object.entries(data))
    for (const [el, vals] of Object.entries(els))
      for (const [prop, v] of Object.entries(vals))
        flat[`${cell} | ${el} | ${prop}`] = v;
  return flat;
}

/** Every difference as one line naming cell, element and property. */
function diff(expected: PanelData, actual: PanelData): string[] {
  const a = flatten(expected);
  const b = flatten(actual);
  const lines: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[k] !== b[k])
      lines.push(
        `${k}: baseline ${a[k] === undefined ? "(absent)" : JSON.stringify(a[k])} != actual ${b[k] === undefined ? "(absent)" : JSON.stringify(b[k])}`,
      );
  }
  return lines.sort();
}

const sorted = <T>(o: Record<string, T>) =>
  Object.keys(o)
    .sort()
    .map((k) => [k, o[k]] as const);

/** One line per element so a baseline diff reads as one changed element. */
function serialize(b: BaselineFile): string {
  const lines: string[] = ["{", '  "panels": {'];
  const panels = sorted(b.panels);
  panels.forEach(([panel, cells], pi) => {
    lines.push(`    ${JSON.stringify(panel)}: {`);
    const cs = sorted(cells);
    cs.forEach(([cell, els], ci) => {
      lines.push(`      ${JSON.stringify(cell)}: {`);
      const es = sorted(els);
      es.forEach(([el, vals], ei) => {
        lines.push(
          `        ${JSON.stringify(el)}: ${JSON.stringify(Object.fromEntries(sorted(vals)))}${ei < es.length - 1 ? "," : ""}`,
        );
      });
      lines.push(`      }${ci < cs.length - 1 ? "," : ""}`);
    });
    lines.push(`    }${pi < panels.length - 1 ? "," : ""}`);
  });
  lines.push("  }", "}", "");
  return lines.join("\n");
}

function readBaseline(): BaselineFile {
  return existsSync(BASELINE_PATH)
    ? (JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as BaselineFile)
    : { panels: {} };
}

function checkBaseline(panel: string, actual: PanelData) {
  if (UPDATE) {
    const all = readBaseline();
    all.panels[panel] = actual;
    writeFileSync(BASELINE_PATH, serialize(all));
    return;
  }
  const expected = readBaseline().panels[panel];
  expect(
    expected,
    `no baseline for panel ${panel}; run with UPDATE_KIT_BASELINE=1 only if this panel is new`,
  ).toBeDefined();
  expect(diff(expected, actual)).toEqual([]);
}

test.setTimeout(120_000);

for (const id of PANELS) {
  test(`kit specimen computed styles: ${id}`, async ({ page }) => {
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

    checkBaseline(id, data);
  });
}
