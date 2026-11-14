import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * role-fallbacks.spec.ts — regression gate for Iris's CSS defaults. Iris ships
 * literal fallbacks at every use site (`var(--orrery-iris-x, <literal>)`).
 * When those fallbacks are re-pointed at design-token role variables, nothing
 * a consumer sees may change. Two checks, one committed baseline:
 *
 * 1. Computed styles. getComputedStyle for a fixed property list on every Iris
 *    element (and its ::before/::after), closed, open-and-settled, hovered,
 *    pressed and keyboard-focused, compared with the baseline.
 * 2. Static fallback inventory. Every `var(...)` use in src/styles.module.css
 *    as (selector, property, variable, fallback text). Some fallbacks are dead
 *    in a browser because JS always writes the variable (--z, --trigger-size,
 *    --sheet-max-width, --sheet-left, --shadow-radius, --shadow-opacity,
 *    --sheet-shadow-opacity, --button-width) or JS reads them
 *    (--sheet-shadow-fade-start/-end). The computed-style scenarios cannot see
 *    those, so ANY edit to a fallback shows up here and has to be justified;
 *    the computed-style scenarios then prove the visible result is unchanged.
 *
 * Scenarios (baseline keys, per project):
 *   S1  bare               bare fixture, no token CSS, light. The
 *                          must-not-change case for every existing npm
 *                          consumer. Repeated per trigger shape (rounded-square,
 *                          square, squircle, rectangle s/m/l) with the
 *                          component's real props and no page-level
 *                          --orrery-iris-* variables.
 *   S2  tokens-light       bare fixture + tokens/generated/css/orrery.css,
 *                          light. Asserted equal to S1 live, and against the
 *                          baseline.
 *   S3  tokens-dark        bare fixture + orrery.css, dark. Today it differs
 *                          from S1 only in browser-supplied default colours
 *                          (button text, link colour), because orrery.css sets
 *                          color-scheme: dark; Iris itself ignores roles.
 *                          EXPECTED to be a deliberate decision point when Iris
 *                          starts reading roles: the builder may NOT update
 *                          this section without the orchestrator's sign-off.
 *   S4  page:<path>[:dark] every example page that renders Iris, default mode,
 *                          and dark where the page has a dark mode. Records no
 *                          box geometry (it depends on fonts), see below.
 *   S5  roles-collision    bare fixture, NO orrery.css, but the page defines
 *                          the unprefixed role names (--page, --text, ...) with
 *                          deliberately wrong values. Asserted equal to S1.
 *
 * Rewriting the baseline is explicit: UPDATE_ROLE_BASELINE=1 npm run test:roles
 * (only the running project's sections, and the static inventory, are
 * rewritten). Nothing else writes it; CI never sets it.
 *
 * Determinism: every snapshot is re-taken until two consecutive reads 150ms
 * apart are identical, so a spring or fade is never sampled mid-flight. Most
 * states run under emulated reduced motion (as geometry.spec does); the hover
 * lift and press scale are gated off under reduced motion, so the fixture also
 * runs hover and pressed WITHOUT it, waiting for the value to leave its
 * resting state first. Box geometry (width, height, left, top, right, bottom,
 * and pseudo offsets) depends on font metrics wherever text exists, so it is
 * recorded on the text-free fixture (S1-S3, S5) only, never for S4. Colours
 * are normalised to rounded rgb()/rgba() so `color(srgb ...)` results do not
 * depend on the Chromium build.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = resolve(HERE, "role-fallbacks.baseline.json");
const CSS_PATH = resolve(HERE, "../src/styles.module.css");
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
interface BaselineFile {
  "static-fallbacks": string[];
  projects: Record<string, Record<string, ScenarioData>>;
}

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
        for (const p of wanted) vals[p] = norm(cs.getPropertyValue(p));
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
          for (const p of wanted) pv[p] = norm(ps.getPropertyValue(p));
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

function sortKeys<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(
    Object.entries(o).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)),
  ) as T;
}

/** One line per element so a baseline diff reads as one changed element. */
function serialize(b: BaselineFile): string {
  const lines: string[] = ["{", '  "static-fallbacks": ['];
  b["static-fallbacks"].forEach((l, i, all) =>
    lines.push(`    ${JSON.stringify(l)}${i < all.length - 1 ? "," : ""}`),
  );
  lines.push("  ],", '  "projects": {');
  const projects = Object.keys(b.projects).sort();
  projects.forEach((proj, pi) => {
    const scs = b.projects[proj];
    lines.push(`    ${JSON.stringify(proj)}: {`);
    const scenarios = Object.keys(scs).sort();
    scenarios.forEach((sc, si) => {
      lines.push(`      ${JSON.stringify(sc)}: {`);
      const states = Object.keys(scs[sc]).sort();
      states.forEach((st, sti) => {
        lines.push(`        ${JSON.stringify(st)}: {`);
        const els = Object.keys(scs[sc][st]).sort();
        els.forEach((el, ei) => {
          lines.push(
            `          ${JSON.stringify(el)}: ${JSON.stringify(sortKeys(scs[sc][st][el]))}${ei < els.length - 1 ? "," : ""}`,
          );
        });
        lines.push(`        }${sti < states.length - 1 ? "," : ""}`);
      });
      lines.push(`      }${si < scenarios.length - 1 ? "," : ""}`);
    });
    lines.push(`    }${pi < projects.length - 1 ? "," : ""}`);
  });
  lines.push("  }", "}", "");
  return lines.join("\n");
}

function readBaseline(): BaselineFile {
  return existsSync(BASELINE_PATH)
    ? (JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as BaselineFile)
    : { "static-fallbacks": [], projects: {} };
}

/** Compare against the committed baseline, or rewrite it when asked. */
function checkBaseline(
  project: string,
  scenario: string,
  actual: ScenarioData,
) {
  if (UPDATE) {
    const all = readBaseline();
    all.projects[project] = {
      ...(all.projects[project] ?? {}),
      [scenario]: actual,
    };
    writeFileSync(BASELINE_PATH, serialize(all));
    return;
  }
  const expected = readBaseline().projects[project]?.[scenario];
  expect(
    expected,
    `no baseline for ${project} / ${scenario}; run with UPDATE_ROLE_BASELINE=1 only if this scenario is new`,
  ).toBeDefined();
  expect(diff(expected!, actual, ["baseline", "actual"])).toEqual([]);
}

// ---------------------------------------------------------------- static ---

/** Every `var(...)` use in the stylesheet, at every nesting depth, as
 * "selector | property | variable | fallback". Pure text; no browser. */
function extractVarUses(css: string): string[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const squash = (s: string) => s.replace(/\s+/g, " ").trim();
  const out: string[] = [];
  const stack: string[] = [];
  let buf = "";

  const scan = (selector: string, prop: string, value: string) => {
    for (
      let at = value.indexOf("var(");
      at !== -1;
      at = value.indexOf("var(", at + 1)
    ) {
      let depth = 1;
      let i = at + 4;
      let comma = -1;
      for (; i < value.length && depth > 0; i++) {
        const c = value[i];
        if (c === "(") depth++;
        else if (c === ")") depth--;
        else if (c === "," && depth === 1 && comma === -1) comma = i;
      }
      const inner = value.slice(at + 4, i - 1);
      const name = squash(comma === -1 ? inner : value.slice(at + 4, comma));
      const fallback =
        comma === -1 ? "(none)" : squash(value.slice(comma + 1, i - 1));
      out.push(`${selector} | ${prop} | ${name} | ${fallback}`);
    }
  };
  const decl = (d: string) => {
    const idx = d.indexOf(":");
    if (idx < 0 || !d.includes("var(")) return;
    scan(stack.join(" > "), squash(d.slice(0, idx)), d.slice(idx + 1));
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'") {
      const end = src.indexOf(c, i + 1);
      buf += src.slice(i, end + 1);
      i = end;
    } else if (c === "{") {
      stack.push(squash(buf));
      buf = "";
    } else if (c === "}") {
      decl(buf);
      stack.pop();
      buf = "";
    } else if (c === ";") {
      decl(buf);
      buf = "";
    } else buf += c;
  }
  return out;
}

// ----------------------------------------------------------------- tests ---

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

const FIXTURE = "/fixtures/role-fallbacks.html";
const fixtureUrl = (q: Record<string, string> = {}) => {
  const qs = new URLSearchParams(q).toString();
  return qs ? `${FIXTURE}?${qs}` : FIXTURE;
};

test.describe("static fallback inventory", () => {
  test("every var() fallback in src/styles.module.css is unchanged", () => {
    const actual = extractVarUses(readFileSync(CSS_PATH, "utf8"));
    if (UPDATE) {
      const all = readBaseline();
      all["static-fallbacks"] = actual;
      writeFileSync(BASELINE_PATH, serialize(all));
      return;
    }
    const expected = readBaseline()["static-fallbacks"];
    const count = (xs: string[]) => {
      const m = new Map<string, number>();
      for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
      return m;
    };
    const a = count(expected);
    const b = count(actual);
    const lines: string[] = [];
    for (const k of new Set([...a.keys(), ...b.keys()]))
      if ((a.get(k) ?? 0) !== (b.get(k) ?? 0))
        lines.push(
          `${(a.get(k) ?? 0) > (b.get(k) ?? 0) ? "removed" : "added"}: ${k}`,
        );
    expect(lines.sort()).toEqual([]);
    expect(actual.length).toBeGreaterThan(50);
  });
});

test.describe("S1-S3, S5 bare fixture", () => {
  test("S1 bare, no token CSS, light", async ({ context }, info) => {
    const s1 = await collectFixture(context, fixtureUrl());
    checkBaseline(info.project.name, "S1 bare", s1);
  });

  // Component-prop variants of S1: the shape and button-size fallbacks only
  // run when the matching prop is set. No page-level --orrery-iris-* vars.
  const VARIANTS: Record<string, Record<string, string>> = {
    "shape=rounded-square": { shape: "rounded-square" },
    "shape=square": { shape: "square" },
    "shape=squircle": { shape: "squircle" },
    "shape=rectangle buttonSize=s": { shape: "rectangle", buttonSize: "s" },
    "shape=rectangle buttonSize=m": { shape: "rectangle", buttonSize: "m" },
    "shape=rectangle buttonSize=l": { shape: "rectangle", buttonSize: "l" },
  };
  for (const [name, q] of Object.entries(VARIANTS)) {
    test(`S1 bare ${name}`, async ({ context }, info) => {
      const data = await collectFixture(context, fixtureUrl(q));
      checkBaseline(info.project.name, `S1 bare ${name}`, data);
    });
  }

  test("S2 bare + orrery.css, light, equals S1", async ({ context }, info) => {
    const s2 = await collectFixture(context, fixtureUrl({ tokens: "1" }));
    const s1 = await collectFixture(context, fixtureUrl());
    // Roles loaded but Iris reading none of them: nothing may move.
    expect(diff(s1, s2, ["S1", "S2"])).toEqual([]);
    checkBaseline(info.project.name, "S2 tokens-light", s2);
  });

  test("S3 bare + orrery.css, dark (DECISION POINT)", async ({
    context,
  }, info) => {
    // EXPECTED to be a deliberate decision point when Iris starts reading
    // roles: dark role values will then legitimately change what renders.
    // The builder may NOT update this baseline without the orchestrator's
    // sign-off.
    const s3 = await collectFixture(
      context,
      fixtureUrl({ tokens: "1", theme: "dark" }),
    );
    checkBaseline(info.project.name, "S3 tokens-dark", s3);
  });

  test("S5 role-name collision, equals S1 (DECISION POINT)", async ({
    context,
  }, info) => {
    // The collision case: no orrery.css, but the host page already defines
    // --page, --text, --accent, --line-width, --radius-round, --space-24 ...
    // for its own reasons, with values that are wrong for Iris. Today Iris
    // ignores them. After Iris reads role variables this WILL change unless
    // the builder namespaces or guards the role reads. It may not be
    // rebaselined without the orchestrator's sign-off.
    const s5 = await collectFixture(context, fixtureUrl({ roles: "wrong" }));
    const s1 = await collectFixture(context, fixtureUrl());
    expect(diff(s1, s5, ["S1", "S5"])).toEqual([]);
    checkBaseline(info.project.name, "S5 roles-collision", s5);
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
      const data = await collectPage(page, url, plan(p), false, false);
      checkBaseline(info.project.name, `S4 page:${p.path}`, data);
    });
    if (p.dark) {
      test(`S4 ${p.path} dark`, async ({ page }, info) => {
        const url = p.dark === "query" ? `${p.path}?dark=1` : p.path;
        const data = await collectPage(
          page,
          url,
          plan(p),
          p.dark === "body",
          false,
        );
        checkBaseline(info.project.name, `S4 page:${p.path}:dark`, data);
      });
    }
  }
});
