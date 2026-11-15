import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * role-bridge.spec.ts. The Iris bridge (tokens/generated/css/orrery.iris.css)
 * is OPT-IN: it points six public --orrery-iris-* variables at the shared
 * roles. The helpers below are copied from role-fallbacks.spec.ts (the locked
 * gate, which is not imported from or edited): same properties, same states,
 * same settling rule, so a bridge result and a bare result are comparable.
 *
 *   B1  bridge, light   bare fixture + orrery.css + orrery.iris.css, light.
 *                       Asserted EQUAL to the no-token bare fixture collected
 *                       live in the same run: opting in changes nothing in
 *                       light. (The reference is role-fallbacks.html itself.)
 *   B2  bridge, dark    the same, data-theme="dark". Differs from light on
 *                       purpose; recorded as its own baseline.
 *   B3  bridge alone    orrery.iris.css WITHOUT orrery.css: the roles are
 *                       undefined, and Iris must still equal the bare fixture.
 *
 * Rewriting the B2 baseline: UPDATE_BRIDGE_BASELINE=1 npm run test:bridge.
 * CI never sets it.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = resolve(HERE, "role-bridge.baseline.json");
const UPDATE = process.env.UPDATE_BRIDGE_BASELINE === "1";

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
  "z-index",
  "opacity",
  "transform",
  "translate",
  "scale",
  "filter",
  "backdrop-filter",
  "outline-color",
  "outline-width",
  "outline-style",
  "outline-offset",
  "corner-shape",
  "mask-image",
  "display",
  "position",
];

/** Box geometry: font-dependent wherever text exists, so recorded on the
 * text-free fixture only. */
const GEOMETRY_PROPS = ["width", "height", "left", "top", "right", "bottom"];

type ElementValues = Record<string, string>;
type Snapshot = Record<string, ElementValues>; // element key -> prop -> value
type ScenarioData = Record<string, Snapshot>; // state -> snapshot

async function collect(page: Page, geometry: boolean): Promise<Snapshot> {
  return page.evaluate(
    ({ props, geomProps, vars, geometry }) => {
      const hash = (s: string) => {
        let h = 5381;
        for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
        return (h >>> 0).toString(16);
      };
      const norm = (v: string) =>
        v
          // color(srgb r g b [/ a]) -> rounded rgb()/rgba(), whatever the
          // Chromium build serialises color-mix results as.
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
          // Inline data URLs (the squircle mask) -> length + hash.
          .replace(
            /url\("data:[^"]*"\)/g,
            (m) => `data-url(${m.length}:${hash(m)})`,
          )
          .replace(/-?\d+\.\d+/g, (n) => String(Number(Number(n).toFixed(3))));
      const out: Record<string, Record<string, string>> = {};
      const counts = new Map<string, number>();
      const rootEls = [...document.querySelectorAll("[data-orrery-iris-root]")];
      const els = document.querySelectorAll(
        "[data-orrery-iris-root], [data-orrery-iris-part], [data-orrery-iris-highlight]",
      );
      const wanted = geometry ? [...props, ...geomProps] : props;
      // Without geometry (S4) also drop what JS derives from the box: the
      // trigger-root position transform and the shadow layer radii.
      const skip = (p: string, part: string) =>
        !geometry &&
        (p === "transform" || (part === "shadow" && p.endsWith("-radius")));
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
        const vals: Record<string, string> = {};
        for (const p of wanted)
          if (!skip(p, part)) vals[p] = norm(cs.getPropertyValue(p));
        for (const v of vars) {
          const val = cs.getPropertyValue(v).trim();
          if (val !== "") vals[v] = norm(val);
        }
        out[key] = vals;
        // ::before/::after carry the trigger highlight and press tint, and the
        // shadow layers' painted shadows: collect any that generate a box.
        for (const pseudo of ["::before", "::after"]) {
          const ps = getComputedStyle(el, pseudo);
          const content = ps.getPropertyValue("content");
          if (content === "none" || content === "normal") continue;
          const pv: Record<string, string> = { content };
          for (const p of wanted)
            if (!skip(p, part)) pv[p] = norm(ps.getPropertyValue(p));
          out[`${key}${pseudo}`] = pv;
        }
      }
      return out;
    },
    { props: PROPS, geomProps: GEOMETRY_PROPS, vars: PUBLIC_VARS, geometry },
  );
}

/** Re-snapshot until two reads 150ms apart are identical. */
async function settled(page: Page, geometry: boolean): Promise<Snapshot> {
  let prev = JSON.stringify(await collect(page, geometry));
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const snap = await collect(page, geometry);
    const cur = JSON.stringify(snap);
    if (cur === prev) return snap;
    prev = cur;
  }
  throw new Error("computed styles never settled within 6s");
}

const TRIGGER = '[data-orrery-iris-part="trigger"]';
const SURFACE = '[data-orrery-iris-part="trigger-surface"]';
const SHEET = '[data-orrery-iris-part="sheet"]';
const CLOSE = '[data-orrery-iris-part="close"]';

type Open = { index: number; how: "click" | "hover" };

async function openCollectClose(
  page: Page,
  index: number,
  how: "click" | "hover",
  geometry: boolean,
): Promise<Snapshot> {
  const trigger = page.locator(TRIGGER).nth(index);
  if (how === "hover") await trigger.hover();
  else await trigger.click();
  await page.locator(SHEET).first().waitFor();
  const snap = await settled(page, geometry);
  if (how === "hover") await page.mouse.move(2, 2);
  await page.keyboard.press("Escape");
  await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 8000 });
  return snap;
}

/** Reduced motion: closed, each open, then hover and pressed (static
 * highlight, no lift or scale). */
async function collectPage(
  page: Page,
  url: string,
  plan: Open[],
  dark: boolean,
  geometry: boolean,
): Promise<ScenarioData> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.locator(TRIGGER).first().waitFor();
  if (dark) {
    await page.evaluate(() => {
      document.body.dataset.darkMode = "true";
    });
  }
  const data: ScenarioData = { closed: await settled(page, geometry) };
  for (const { index, how } of plan) {
    data[`open:${index}`] = await openCollectClose(page, index, how, geometry);
  }
  // Trigger feedback states, last: the highlight and press tint are the
  // ::before/::after layers of the trigger surface. The press is never
  // released, so it cannot open the sheet; the page is discarded after.
  if (plan[0]?.how !== "click") return data; // a hover trigger opens a preview
  await page.locator(TRIGGER).first().hover();
  data["closed:hover"] = await settled(page, geometry);
  await page.mouse.down();
  data["closed:pressed"] = await settled(page, geometry);
  return data;
}

/** Keyboard focus: Tab to the trigger, open it, Tab to the close button. */
async function collectFocus(
  page: Page,
  url: string,
  geometry: boolean,
): Promise<ScenarioData> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.locator(TRIGGER).first().waitFor();
  const focused = (sel: string) =>
    page.evaluate((s) => document.activeElement?.matches(s) ?? false, sel);
  const data: ScenarioData = {};
  for (let i = 0; i < 4 && !(await focused(TRIGGER)); i++)
    await page.keyboard.press("Tab");
  expect(await focused(TRIGGER), "Tab never reached the trigger").toBe(true);
  data["focus:trigger"] = await settled(page, geometry);
  await page.keyboard.press("Enter");
  await page.locator(SHEET).first().waitFor();
  await settled(page, geometry);
  for (let i = 0; i < 6 && !(await focused(CLOSE)); i++)
    await page.keyboard.press("Tab");
  expect(await focused(CLOSE), "Tab never reached the close button").toBe(true);
  data["focus:close"] = await settled(page, geometry);
  return data;
}

/** Normal motion: hover lift and press scale are live. Waits for the value to
 * leave its resting state so a not-yet-started transition cannot settle early. */
async function collectMotion(
  page: Page,
  url: string,
  geometry: boolean,
): Promise<ScenarioData> {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(url);
  await page.locator(TRIGGER).first().waitFor();
  const surface = page.locator(SURFACE).first();
  const read = (prop: "translate" | "scale") =>
    surface.evaluate((el, p) => getComputedStyle(el)[p], prop);
  const data: ScenarioData = {};
  await page.locator(TRIGGER).first().hover();
  await expect
    .poll(() => read("translate"), { timeout: 5000 })
    .not.toBe("none");
  await page.waitForTimeout(250);
  data["motion:hover"] = await settled(page, geometry);
  await page.mouse.down();
  await expect.poll(() => read("scale"), { timeout: 5000 }).not.toBe("none");
  await page.waitForTimeout(250);
  data["motion:pressed"] = await settled(page, geometry);
  return data;
}

// Trigger 0 is the sheet (click), trigger 1 the link preview (hover).
const FIXTURE_PLAN: Open[] = [
  { index: 0, how: "click" },
  { index: 1, how: "hover" },
];

/** All three runs on the text-free fixture, each in a fresh page. */
async function collectFixture(
  ctx: BrowserContext,
  url: string,
): Promise<ScenarioData> {
  const data: ScenarioData = {};
  const runs: Array<(p: Page) => Promise<ScenarioData>> = [
    (p) => collectPage(p, url, FIXTURE_PLAN, false, true),
    (p) => collectFocus(p, url, true),
    (p) => collectMotion(p, url, true),
  ];
  for (const run of runs) {
    const page = await ctx.newPage();
    Object.assign(data, await run(page));
    await page.close();
  }
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

/** One line per element so a baseline diff reads as one changed element. */
function serialize(
  projects: Record<string, Record<string, ScenarioData>>,
): string {
  const lines: string[] = ["{", '  "projects": {'];
  const names = Object.keys(projects).sort();
  names.forEach((proj, pi) => {
    lines.push(`    ${JSON.stringify(proj)}: {`);
    const scenarios = Object.keys(projects[proj]).sort();
    scenarios.forEach((sc, si) => {
      lines.push(`      ${JSON.stringify(sc)}: {`);
      const data = projects[proj][sc];
      const states = Object.keys(data).sort();
      states.forEach((st, sti) => {
        lines.push(`        ${JSON.stringify(st)}: {`);
        const els = Object.keys(data[st]).sort();
        els.forEach((el, ei) => {
          const vals = Object.fromEntries(
            Object.entries(data[st][el]).sort(([x], [y]) =>
              x < y ? -1 : x > y ? 1 : 0,
            ),
          );
          lines.push(
            `          ${JSON.stringify(el)}: ${JSON.stringify(vals)}${ei < els.length - 1 ? "," : ""}`,
          );
        });
        lines.push(`        }${sti < states.length - 1 ? "," : ""}`);
      });
      lines.push(`      }${si < scenarios.length - 1 ? "," : ""}`);
    });
    lines.push(`    }${pi < names.length - 1 ? "," : ""}`);
  });
  lines.push("  }", "}", "");
  return lines.join("\n");
}

function readBaseline(): Record<string, Record<string, ScenarioData>> {
  return existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")).projects
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
    `no baseline for ${project} / ${scenario}; run with UPDATE_BRIDGE_BASELINE=1 only if this scenario is new`,
  ).toBeDefined();
  expect(diff(expected!, actual, ["baseline", "actual"])).toEqual([]);
}

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

const BARE = "/fixtures/role-fallbacks.html";
const FIXTURE = "/fixtures/role-bridge.html";
const url = (q: Record<string, string> = {}) => {
  const qs = new URLSearchParams(q).toString();
  return qs ? `${FIXTURE}?${qs}` : FIXTURE;
};

const BRIDGED_VARS = [
  "--orrery-iris-surface-elevated",
  "--orrery-iris-text",
  "--orrery-iris-accent",
  "--orrery-iris-surface-border-width",
  "--orrery-iris-trigger-radius",
  "--orrery-iris-sheet-padding",
];

function withoutBridgeVars(data: ScenarioData): ScenarioData {
  return Object.fromEntries(
    Object.entries(data).map(([state, snap]) => [
      state,
      Object.fromEntries(
        Object.entries(snap).map(([el, vals]) => [
          el,
          Object.fromEntries(
            Object.entries(vals).filter(([p]) => !BRIDGED_VARS.includes(p)),
          ),
        ]),
      ),
    ]),
  );
}

test.describe("Iris bridge", () => {
  test("B1 bridge, light, equals the bare fixture", async ({ context }) => {
    const bare = await collectFixture(context, BARE);
    const b1 = await collectFixture(context, url({ tokens: "1", bridge: "1" }));
    // The bridge sets six --orrery-iris-* variables, so reading those six back
    // differs from the bare page by construction. Every real property, on
    // every element and pseudo-element, must still be equal.
    expect(diff(withoutBridgeVars(bare), withoutBridgeVars(b1), ["bare", "bridge-light"])).toEqual(
      [],
    );
  });

  test("B2 bridge, dark (new opt-in look, baseline)", async ({
    context,
  }, info) => {
    const b2 = await collectFixture(
      context,
      url({ tokens: "1", bridge: "1", theme: "dark" }),
    );
    checkBaseline(info.project.name, "B2 bridge-dark", b2);
  });

  test("B3 bridge alone, no orrery.css, equals the bare fixture", async ({
    context,
  }) => {
    const bare = await collectFixture(context, BARE);
    const b3 = await collectFixture(context, url({ bridge: "1" }));
    expect(diff(bare, b3, ["bare", "bridge-alone"])).toEqual([]);
  });
});
