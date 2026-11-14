import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * role-fallbacks.spec.ts — computed-style regression gate for Iris's CSS
 * defaults. Iris ships literal fallbacks at every use site
 * (`var(--orrery-iris-x, <literal>)`). When those fallbacks are re-pointed at
 * design-token role variables, nothing a consumer sees may change. This spec
 * records getComputedStyle for a fixed property list on every Iris element
 * (closed and open-and-settled) and compares it with a committed baseline.
 *
 * Scenarios (baseline keys):
 *   S1  bare            bare fixture, no token CSS, light. The must-not-change
 *                       case for every existing npm consumer.
 *   S2  tokens-light    bare fixture + tokens/generated/css/orrery.css, light.
 *                       Asserted equal to S1 live, and against the baseline.
 *   S3  tokens-dark     bare fixture + orrery.css, dark. Today Iris ignores
 *                       roles, so this equals S1. EXPECTED to be a deliberate
 *                       decision point when Iris starts reading roles: the
 *                       builder may NOT update this section without the
 *                       orchestrator's sign-off.
 *   S4  page:<path>[:dark]  every example page that renders Iris, in its
 *                       default mode, and dark where the page has a dark mode.
 *
 * Rewriting the baseline is explicit: UPDATE_ROLE_BASELINE=1 npm run test:roles
 * (only the running project's sections are rewritten). Nothing else writes it.
 *
 * Determinism: reduced motion is emulated (as geometry.spec does) and every
 * snapshot is re-taken until two consecutive reads 150ms apart are identical,
 * so a spring or fade is never sampled mid-flight. Width/height are left out
 * for any element that holds text, and in the open state for the parts whose
 * box follows the sheet's content, so the baseline does not depend on the
 * machine's fonts. The bare fixture has no text at all, so it records every
 * size.
 */

const BASELINE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "role-fallbacks.baseline.json",
);
const UPDATE = process.env.UPDATE_ROLE_BASELINE === "1";

/** The 22 public custom properties from README "Theming", plus the
 * trigger-size the Root sets itself. */
const PUBLIC_VARS = [
  "--orrery-iris-surface",
  "--orrery-iris-surface-elevated",
  "--orrery-iris-surface-border",
  "--orrery-iris-surface-border-width",
  "--orrery-iris-text",
  "--orrery-iris-accent",
  "--orrery-iris-sheet-max-width",
  "--orrery-iris-shared-size",
  "--orrery-iris-sheet-radius",
  "--orrery-iris-trigger-radius",
  "--orrery-iris-sheet-padding",
  "--orrery-iris-shadow",
  "--orrery-iris-sheet-shadow",
  "--orrery-iris-sheet-shadow-fade-start",
  "--orrery-iris-sheet-shadow-fade-end",
  "--orrery-iris-z",
  "--orrery-iris-trigger-hover-lift",
  "--orrery-iris-trigger-press-scale",
  "--orrery-iris-trigger-highlight-color",
  "--orrery-iris-trigger-highlight-size",
  "--orrery-iris-trigger-highlight-strength",
  "--orrery-iris-trigger-press-tint",
  "--orrery-iris-trigger-size",
];

const PROPS = [
  "background-color",
  "background-image",
  "color",
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
  "box-shadow",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "max-width",
  "width",
  "height",
  "z-index",
  "opacity",
  "transform",
  "filter",
  "backdrop-filter",
  "outline-color",
  "outline-width",
  "outline-style",
  "outline-offset",
  "display",
  "position",
];

/** Extra properties read on ::before/::after only. */
const PSEUDO_EXTRA_PROPS = ["content", "left", "top", "translate", "scale"];

/** Parts whose open-state box follows the sheet's (text-bearing) content. */
const SIZE_FOLLOWS_CONTENT = [
  "root",
  "sheet",
  "content",
  "item",
  "shadow",
  "backdrop",
  "media",
  "trigger-surface",
  "shared",
];

type ElementValues = Record<string, string>;
type Snapshot = Record<string, ElementValues>; // element key -> prop -> value
type ScenarioData = Record<string, Snapshot>; // state -> snapshot
type Baseline = Record<string, Record<string, ScenarioData>>; // project -> scenario -> data

async function collect(page: Page, open: boolean): Promise<Snapshot> {
  return page.evaluate(
    ({ props, pseudoProps, vars, sizeFollows, open }) => {
      const round = (v: string) =>
        v.replace(/-?\d+\.\d+/g, (n) => String(Number(Number(n).toFixed(3))));
      const out: Record<string, Record<string, string>> = {};
      const counts = new Map<string, number>();
      const rootEls = [...document.querySelectorAll("[data-orrery-iris-root]")];
      const els = document.querySelectorAll(
        "[data-orrery-iris-root], [data-orrery-iris-part], [data-orrery-iris-highlight]",
      );
      for (const el of els) {
        const rootEl = el.closest("[data-orrery-iris-root]");
        const ri = rootEl ? rootEls.indexOf(rootEl) : -1;
        const part = el.hasAttribute("data-orrery-iris-root")
          ? "root"
          : (el.getAttribute("data-orrery-iris-part") ?? "highlight");
        const base = `r${ri}/${part}`;
        const n = counts.get(base) ?? 0;
        counts.set(base, n + 1);
        const key = `${base}#${n}`;
        const cs = getComputedStyle(el);
        const hasText = (el.textContent ?? "").trim() !== "";
        const skipSize = hasText || (open && sizeFollows.includes(part));
        const vals: Record<string, string> = {};
        for (const p of props) {
          if (skipSize && (p === "width" || p === "height")) continue;
          vals[p] = round(cs.getPropertyValue(p));
        }
        for (const v of vars) {
          const val = cs.getPropertyValue(v).trim();
          if (val !== "") vals[v] = round(val);
        }
        out[key] = vals;
        // ::before/::after carry the trigger highlight and press tint, and the
        // shadow layers' painted shadows: collect any that generate a box.
        for (const pseudo of ["::before", "::after"]) {
          const ps = getComputedStyle(el, pseudo);
          const content = ps.getPropertyValue("content");
          if (content === "none" || content === "normal") continue;
          const pv: Record<string, string> = {};
          for (const p of [...props, ...pseudoProps]) {
            if (skipSize && (p === "width" || p === "height")) continue;
            pv[p] = round(ps.getPropertyValue(p));
          }
          out[`${key}${pseudo}`] = pv;
        }
      }
      return out;
    },
    {
      props: PROPS,
      pseudoProps: PSEUDO_EXTRA_PROPS,
      vars: PUBLIC_VARS,
      sizeFollows: SIZE_FOLLOWS_CONTENT,
      open,
    },
  );
}

/** Re-snapshot until two reads 150ms apart are identical. */
async function settled(page: Page, open: boolean): Promise<Snapshot> {
  let prev = JSON.stringify(await collect(page, open));
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const snap = await collect(page, open);
    const cur = JSON.stringify(snap);
    if (cur === prev) return snap;
    prev = cur;
  }
  throw new Error("computed styles never settled within 6s");
}

const TRIGGER = '[data-orrery-iris-part="trigger"]';
const SHEET = '[data-orrery-iris-part="sheet"]';

type Open = { index: number; how: "click" | "hover" };

async function openCollectClose(
  page: Page,
  index: number,
  how: "click" | "hover",
): Promise<Snapshot> {
  const trigger = page.locator(TRIGGER).nth(index);
  if (how === "hover") await trigger.hover();
  else await trigger.click();
  await page.locator(SHEET).first().waitFor();
  const snap = await settled(page, true);
  if (how === "hover") await page.mouse.move(2, 2);
  await page.keyboard.press("Escape");
  await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 8000 });
  return snap;
}

async function collectPage(
  page: Page,
  url: string,
  plan: Open[],
  dark: boolean,
): Promise<ScenarioData> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.locator(TRIGGER).first().waitFor();
  if (dark) {
    await page.evaluate(() => {
      document.body.dataset.darkMode = "true";
    });
  }
  const data: ScenarioData = { closed: await settled(page, false) };
  for (const { index, how } of plan) {
    data[`open:${index}`] = await openCollectClose(page, index, how);
  }
  // Trigger feedback states, last: the highlight and press tint are the
  // ::before/::after layers of the trigger surface. The press is never
  // released, so it cannot open the sheet; the page is discarded after.
  if (plan[0]?.how !== "click") return data; // a hover trigger opens a preview
  const trigger = page.locator(TRIGGER).first();
  await trigger.hover();
  data["closed:hover"] = await settled(page, false);
  await page.mouse.down();
  data["closed:pressed"] = await settled(page, false);
  return data;
}

function flatten(data: ScenarioData): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [state, snap] of Object.entries(data))
    for (const [el, vals] of Object.entries(snap))
      for (const [prop, v] of Object.entries(vals))
        flat[`${state} ${el} ${prop}`] = v;
  return flat;
}

/** Every difference as one line naming state, element and property. */
function diff(
  expected: ScenarioData,
  actual: ScenarioData,
  labels: [string, string],
): string[] {
  const a = flatten(expected);
  const b = flatten(actual);
  const lines: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]).values()) {
    if (a[k] !== b[k])
      lines.push(
        `${k}: ${labels[0]} ${a[k] === undefined ? "(absent)" : JSON.stringify(a[k])} != ${labels[1]} ${b[k] === undefined ? "(absent)" : JSON.stringify(b[k])}`,
      );
  }
  return lines.sort();
}

function sortKeys<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(
    Object.entries(o).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)),
  ) as T;
}

/** One line per element so a baseline diff reads as one changed element. */
function serialize(b: Baseline): string {
  const lines: string[] = ["{"];
  const projects = Object.keys(b).sort();
  projects.forEach((proj, pi) => {
    lines.push(`  ${JSON.stringify(proj)}: {`);
    const scenarios = Object.keys(b[proj]).sort();
    scenarios.forEach((sc, si) => {
      lines.push(`    ${JSON.stringify(sc)}: {`);
      const states = Object.keys(b[proj][sc]).sort();
      states.forEach((st, sti) => {
        lines.push(`      ${JSON.stringify(st)}: {`);
        const els = Object.keys(b[proj][sc][st]).sort();
        els.forEach((el, ei) => {
          lines.push(
            `        ${JSON.stringify(el)}: ${JSON.stringify(sortKeys(b[proj][sc][st][el]))}${ei < els.length - 1 ? "," : ""}`,
          );
        });
        lines.push(`      }${sti < states.length - 1 ? "," : ""}`);
      });
      lines.push(`    }${si < scenarios.length - 1 ? "," : ""}`);
    });
    lines.push(`  }${pi < projects.length - 1 ? "," : ""}`);
  });
  lines.push("}", "");
  return lines.join("\n");
}

function readBaseline(): Baseline {
  return existsSync(BASELINE_PATH)
    ? (JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Baseline)
    : {};
}

/** Compare against the committed baseline, or rewrite it when asked. */
function checkBaseline(
  project: string,
  scenario: string,
  actual: ScenarioData,
) {
  if (UPDATE) {
    const all = readBaseline();
    all[project] = { ...(all[project] ?? {}), [scenario]: actual };
    writeFileSync(BASELINE_PATH, serialize(all));
    return;
  }
  const expected = readBaseline()[project]?.[scenario];
  expect(
    expected,
    `no baseline for ${project} / ${scenario}; run with UPDATE_ROLE_BASELINE=1 only if this scenario is new`,
  ).toBeDefined();
  expect(diff(expected!, actual, ["baseline", "actual"])).toEqual([]);
}

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

const FIXTURE = "/fixtures/role-fallbacks.html";
// Trigger 0 is the sheet (click), trigger 1 the link preview (hover).
const FIXTURE_PLAN: Open[] = [
  { index: 0, how: "click" },
  { index: 1, how: "hover" },
];

test.describe("S1-S3 bare fixture", () => {
  test("S1 bare, no token CSS, light", async ({ page }, info) => {
    const s1 = await collectPage(page, FIXTURE, FIXTURE_PLAN, false);
    checkBaseline(info.project.name, "S1 bare", s1);
  });

  test("S2 bare + orrery.css, light, equals S1", async ({
    page,
    browser,
  }, info) => {
    const s2 = await collectPage(
      page,
      `${FIXTURE}?tokens=1`,
      FIXTURE_PLAN, false);
    const ctx = await browser.newContext();
    const s1 = await collectPage(
      await ctx.newPage(),
      FIXTURE,
      FIXTURE_PLAN, false);
    await ctx.close();
    // Roles loaded but Iris reading none of them: nothing may move.
    expect(diff(s1, s2, ["S1", "S2"])).toEqual([]);
    checkBaseline(info.project.name, "S2 tokens-light", s2);
  });

  test("S3 bare + orrery.css, dark (DECISION POINT)", async ({
    page,
  }, info) => {
    // EXPECTED to be a deliberate decision point when Iris starts reading
    // roles: dark role values will then legitimately change what renders.
    // The builder may NOT update this baseline without the orchestrator's
    // sign-off.
    const s3 = await collectPage(
      page,
      `${FIXTURE}?tokens=1&theme=dark`,
      FIXTURE_PLAN,
      false,
    );
    checkBaseline(info.project.name, "S3 tokens-dark", s3);
  });
});

// Example pages that render Iris. `dark` is how the page reaches its dark
// mode: "body" sets body[data-dark-mode] (example.css), "query" is ?dark=1.
// Not covered: /play.html and /surface.html (no Iris mounted until the user
// configures one), /canvas.html (tool page; its headless load stalls).
const PAGES: {
  path: string;
  how: "click" | "hover";
  dark?: "body" | "query";
  opens: number;
}[] = [
  { path: "/", how: "click", dark: "body", opens: 2 },
  { path: "/flagship.html", how: "click", opens: 1 },
  { path: "/media-card.html", how: "click", opens: 1 },
  { path: "/list.html", how: "click", opens: 1 },
  { path: "/contact.html", how: "click", opens: 1 },
  { path: "/video.html", how: "click", opens: 1 },
  { path: "/buttons.html", how: "click", opens: 1 },
  { path: "/tune.html", how: "click", opens: 1 },
  { path: "/link-preview.html", how: "hover", dark: "query", opens: 1 },
];

const plan = (p: (typeof PAGES)[number]): Open[] =>
  Array.from({ length: p.opens }, (_, index) => ({ index, how: p.how }));

test.describe("S4 example pages", () => {
  for (const p of PAGES) {
    test(`S4 ${p.path}`, async ({ page }, info) => {
      const url = p.dark === "query" ? `${p.path}?dark=0` : p.path;
      const data = await collectPage(page, url, plan(p), false);
      checkBaseline(info.project.name, `S4 page:${p.path}`, data);
    });
    if (p.dark) {
      test(`S4 ${p.path} dark`, async ({ page }, info) => {
        const url = p.dark === "query" ? `${p.path}?dark=1` : p.path;
        const data = await collectPage(page, url, plan(p), p.dark === "body");
        checkBaseline(info.project.name, `S4 page:${p.path}:dark`, data);
      });
    }
  }
});
