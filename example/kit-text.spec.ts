import { test, expect, type Frame, type Page } from "@playwright/test";
import { FOCUS_SENTINEL, openSpecimen } from "./kit/kit-test";

/**
 * kit-text.spec.ts: the rendered half of DESIGN.md, Foundations, on every kit golden example
 * (fixtures/kit-examples.html, brand orrery light) and on the kit specimen (kit.html: orrery
 * light, orrery dark and solar, held-open frames included), at 375 and 1280 wide. Chromium
 * only: it is the one browser that proves text-wrap-style: pretty today.
 *
 *  - text-wrap-rendered: a paragraph or list item of two lines or more ends on two words or more;
 *    a heading of two words or more never has a line holding one word; buttons, tabs, field
 *    labels and select values are one line, never truncated, never cut by a clipping ancestor or
 *    the viewport (fork 3: a label too long for one line fails; there is no ellipsis to fall back
 *    on). A label inside a scroll container (a Tabs list with more tabs than it is wide) is whole
 *    and reachable, so the container is not a cut.
 *  - focus-ring-drawn: every tab stop, reached with the Tab key, draws an outline of
 *    --ring-width in its scope's --accent.
 *  - hit-target-rendered: every interactive kit element (an orr- class on a button, link,
 *    input, tab stop or interactive role) answers presses over at least --hit-target-min on each
 *    axis through its centre, pseudo-element hit areas included. A tab panel and a dialog take focus
 *    only so the keyboard can reach their content; they are regions, not press targets, and are
 *    left out. Each element is measured on its own (every other element stops taking presses while
 *    it is measured), so a neighbour that wins an overlapping press does not count against it.
 *    Half a pixel of tolerance on each edge.
 *
 * CI runs this as its own step at the end of the roles job (.github/workflows/checks.yml), so a
 * failure here never skips the kit baseline or the bridge gate.
 *
 * The detectors run in the page; the first test plants a failure of each kind and proves every
 * detector catches it.
 */

const WIDTHS = [375, 1280] as const;

type Target = {
  name: string;
  open: (page: Page) => Promise<void>;
  /** Where kit text is read in the page's own document. Held-open frames are read whole. */
  scope: string;
};

const TARGETS: Target[] = [
  {
    name: "golden examples",
    open: async (page) => {
      await page.goto("/fixtures/kit-examples.html");
      await expect(page.locator("[data-example]").first()).toBeVisible();
    },
    scope: "[data-example]",
  },
  {
    name: "specimen",
    open: openSpecimen,
    scope: "[data-panel], [data-portal-for]",
  },
];

/** In-page, self-contained. Text failures under `scope`: paragraphs, headings and labels. */
function scanText(args: { scope: string }) {
  const doc = document;
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    return (
      r.width > 0 &&
      r.height > 0 &&
      getComputedStyle(el).visibility !== "hidden"
    );
  };
  // One entry per rendered word: its text and its first box. Lines are words whose boxes overlap vertically.
  const lines = (el: Element) => {
    const words: { text: string; top: number; bottom: number }[] = [];
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? "";
      for (const m of text.matchAll(/\S+/g)) {
        const range = doc.createRange();
        range.setStart(n, m.index!);
        range.setEnd(n, m.index! + m[0].length);
        const box = [...range.getClientRects()].find(
          (b) => b.width > 0 && b.height > 0,
        );
        if (box) words.push({ text: m[0], top: box.top, bottom: box.bottom });
      }
    }
    const out: { words: string[]; bottom: number }[] = [];
    for (const w of words) {
      const line = out[out.length - 1];
      if (line && w.top < line.bottom - 1) {
        line.words.push(w.text);
        line.bottom = Math.max(line.bottom, w.bottom);
      } else out.push({ words: [w.text], bottom: w.bottom });
    }
    return out.map((l) => l.words);
  };
  const where = (el: Element) => {
    const cell = el.closest("[data-cell]")?.getAttribute("data-cell");
    const block = el.closest("[data-block]")?.getAttribute("data-block");
    const example = el.closest("[data-example]")?.getAttribute("data-example");
    const panel =
      el.closest("[data-panel]")?.getAttribute("data-panel") ??
      doc.documentElement.getAttribute("data-brand");
    return [example, panel, block, cell].filter(Boolean).join(" ");
  };
  const show = (ls: string[][]) => ls.map((l) => l.join(" ")).join(" / ");
  const roots =
    window === window.top ? [...doc.querySelectorAll(args.scope)] : [doc.body];
  const within = (sel: string) =>
    [...new Set(roots.flatMap((r) => [...r.querySelectorAll(sel)]))].filter(
      visible,
    );

  const paragraphs: string[] = [];
  const headings: string[] = [];
  const labels: string[] = [];
  let counted = 0;
  for (const el of within("p, li")) {
    counted++;
    const ls = lines(el);
    if (ls.length >= 2 && ls[ls.length - 1].length < 2)
      paragraphs.push(
        `${where(el)}: <${el.tagName.toLowerCase()}> ends on a lone word: ${show(ls)}`,
      );
  }
  for (const el of within(
    "h1, h2, h3, h4, h5, h6, [role=heading], .orr-dialog__title",
  )) {
    counted++;
    const ls = lines(el);
    if (ls.flat().length >= 2 && ls.length >= 2 && ls.some((l) => l.length < 2))
      headings.push(`${where(el)}: heading has a one-word line: ${show(ls)}`);
  }
  const LABELS =
    ".orr-button, .orr-tabs__tab, .orr-field__label:not(:has(> .orr-control)), .orr-select__value";
  for (const el of within(LABELS)) {
    const text = (el.textContent ?? "").trim();
    if (!text) continue;
    counted++;
    const ls = lines(el);
    const name = `${where(el)}: ${el.className.split(" ")[0]} "${text}"`;
    if (ls.length > 1) {
      labels.push(`${name} wraps to ${ls.length} lines: ${show(ls)}`);
      continue;
    }
    const range = doc.createRange();
    range.selectNodeContents(el);
    const t = range.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const he = el as HTMLElement;
    if (
      he.scrollWidth > he.clientWidth + 1 &&
      getComputedStyle(el).overflowX !== "visible"
    )
      labels.push(
        `${name} is truncated: ${he.scrollWidth}px of text in ${he.clientWidth}px`,
      );
    else if (t.left < box.left - 1 || t.right > box.right + 1)
      labels.push(
        `${name} overflows its box: text ${Math.round(t.left)}..${Math.round(t.right)}, box ${Math.round(box.left)}..${Math.round(box.right)}`,
      );
    else {
      // The nearest ancestor that clips horizontally decides. A scroll container (a Tabs list with
      // more tabs than it is wide) keeps the label whole and reachable, so it is not a cut.
      let clip: Element | null = null;
      for (let a = el.parentElement; a && !clip; a = a.parentElement)
        if (getComputedStyle(a).overflowX !== "visible") clip = a;
      const scrolls =
        !!clip && /^(auto|scroll)$/.test(getComputedStyle(clip).overflowX);
      const b = clip?.getBoundingClientRect();
      if (b && !scrolls && (t.left < b.left - 1 || t.right > b.right + 1))
        labels.push(
          `${name} is cut by ${clip!.className || clip!.tagName}: text ${Math.round(t.left)}..${Math.round(t.right)}, clip ${Math.round(b.left)}..${Math.round(b.right)}`,
        );
      else if (
        !scrolls &&
        (t.left < -1 || t.right > doc.documentElement.clientWidth + 1)
      )
        labels.push(
          `${name} runs past the viewport: text ${Math.round(t.left)}..${Math.round(t.right)}, viewport 0..${doc.documentElement.clientWidth}`,
        );
    }
  }
  return { counted, paragraphs, headings, labels };
}

/** In-page, self-contained. Interactive kit elements whose hit area is under --hit-target-min on an axis. */
function scanHits() {
  const doc = document;
  if (doc.body.inert) return { counted: 0, small: [] as string[] };
  const INTERACTIVE =
    "button, a[href], input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex='-1']):not([role=tabpanel], [role=dialog]), " +
    "[role=button], [role=link], [role=tab], [role=checkbox], [role=radio], [role=switch], [role=option], [role=menuitem], [role=combobox]";
  const els = [...doc.querySelectorAll<HTMLElement>(INTERACTIVE)].filter(
    (el) => {
      if (![...el.classList].some((c) => c.startsWith("orr-"))) return false;
      if (el.closest("[aria-hidden='true'], [inert]")) return false;
      const r = el.getBoundingClientRect();
      return (
        r.width > 1 &&
        r.height > 1 &&
        getComputedStyle(el).visibility !== "hidden"
      );
    },
  );
  const style = doc.createElement("style");
  style.textContent =
    "html[data-hit-probe] * { pointer-events: none !important; }" +
    "html[data-hit-probe] [data-hit-probe], html[data-hit-probe] [data-hit-probe] *, " +
    "html[data-hit-probe] [data-hit-probe]::before, html[data-hit-probe] [data-hit-probe]::after { pointer-events: auto !important; }";
  doc.head.append(style);
  doc.documentElement.setAttribute("data-hit-probe", "");
  const small: string[] = [];
  try {
    for (const el of els) {
      el.scrollIntoView({ block: "center", inline: "center" });
      el.setAttribute("data-hit-probe", "");
      const scope = el.closest("[data-brand]") ?? doc.documentElement;
      const min = parseFloat(
        getComputedStyle(scope).getPropertyValue("--hit-target-min"),
      );
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hits = (x: number, y: number) => {
        const h = doc.elementFromPoint(x, y);
        return !!h && (h === el || el.contains(h));
      };
      const reach = (dx: number, dy: number) => {
        let d = 0;
        while (d < 200 && hits(cx + dx * (d + 0.5), cy + dy * (d + 0.5)))
          d += 0.5;
        return d;
      };
      const w = reach(-1, 0) + reach(1, 0);
      const h = reach(0, -1) + reach(0, 1);
      el.removeAttribute("data-hit-probe");
      // Each reach stops half a pixel inside the edge it finds, so a box exactly at the floor measures min - 1.
      if (w < min - 1 || h < min - 1) {
        const label =
          el.getAttribute("aria-label") ??
          (el.textContent ?? "").trim().slice(0, 40);
        const cell = el.closest("[data-cell]")?.getAttribute("data-cell");
        const block = el.closest("[data-block]")?.getAttribute("data-block");
        const example = el
          .closest("[data-example]")
          ?.getAttribute("data-example");
        small.push(
          `${[example, block, cell].filter(Boolean).join(" ")}: ${el.className.split(" ")[0]} "${label}" answers presses over ${w + 1}x${h + 1}px, under ${min}px`,
        );
      }
    }
  } finally {
    doc.documentElement.removeAttribute("data-hit-probe");
    style.remove();
  }
  return { counted: els.length, small };
}

/** In-page, self-contained. The focused element, through any same-origin iframes, and whether it draws the ring. */
function focusedRing(args: { sentinel: string }) {
  let el = document.activeElement as HTMLElement | null;
  while (el instanceof HTMLIFrameElement)
    el = (el.contentDocument?.activeElement as HTMLElement | null) ?? null;
  if (!el || el === el.ownerDocument.body) return null;
  if (el.matches(args.sentinel))
    return { id: "", revisit: false, sentinel: true, ok: true, why: "" };
  const first = !el.dataset.tabStop;
  if (first) el.dataset.tabStop = String(Math.random()).slice(2);
  const win = el.ownerDocument.defaultView!;
  const cs = win.getComputedStyle(el);
  const scope = (el.closest("[data-brand]") ??
    el.ownerDocument.documentElement) as HTMLElement;
  const probe = el.ownerDocument.createElement("span");
  probe.style.color = "var(--accent)";
  scope.append(probe);
  const accent = win.getComputedStyle(probe).color;
  probe.remove();
  const ringWidth = win
    .getComputedStyle(scope)
    .getPropertyValue("--ring-width")
    .trim();
  const ok =
    cs.outlineStyle !== "none" &&
    cs.outlineWidth === ringWidth &&
    cs.outlineColor === accent;
  const name =
    el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 40);
  const where = [
    el.closest("[data-example]")?.getAttribute("data-example"),
    el.closest("[data-panel]")?.getAttribute("data-panel"),
    el.closest("[data-block]")?.getAttribute("data-block"),
    el.closest("[data-cell]")?.getAttribute("data-cell"),
  ]
    .filter(Boolean)
    .join(" ");
  return {
    id: el.dataset.tabStop!,
    revisit: !first,
    sentinel: false,
    ok,
    why: `${where}: <${el.tagName.toLowerCase()} class="${el.className}"> "${name}" draws outline ${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}, expected solid ${ringWidth} ${accent}`,
  };
}

/** Tab from the top of the page until focus comes back round; every stop is checked. */
async function tabStops(page: Page) {
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
  const failures: string[] = [];
  let stops = 0;
  for (let i = 0; i < 600; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(focusedRing, { sentinel: FOCUS_SENTINEL });
    if (!r) {
      if (stops) break;
      continue;
    }
    if (r.sentinel) continue;
    if (r.revisit) break;
    stops++;
    if (!r.ok) failures.push(r.why);
  }
  return { stops, failures };
}

/** Every document of the page: its own, then each held-open frame's. */
const documents = (page: Page): Frame[] => page.frames();

test.describe("detectors", () => {
  test("a planted lone word, one-word heading line, wrapped label, truncated value, missing ring and small hit area all fail", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.setContent(`
      <style>
        :root { --hit-target-min: 44px; --ring-width: 2px; --accent: rgb(0, 0, 0); font: 16px/1.5 monospace; }
        h2 { font: inherit; margin: 0; }
        .narrow { width: 10ch; }
        .orr-button { font: inherit; min-width: 44px; min-height: 44px; }
        .orr-button:focus-visible { outline: var(--ring-width) solid var(--accent); }
        .orr-button.no-ring:focus-visible { outline: none; }
        .tiny { width: 20px; height: 20px; min-width: 0; min-height: 0; padding: 0; }
        .orr-select__value { display: block; width: 60px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      </style>
      <div data-example="planted">
        <p class="narrow">aaaa bbbb cccc dddd eeeeeeee</p>
        <p class="narrow">aaaa bbbb cccc dd</p>
        <h2 class="narrow">Rename orbit now</h2>
        <button class="orr-button" style="width: 60px">Save all changes</button>
        <span class="orr-select__value">A long select value</span>
        <button class="orr-button no-ring">Ring</button>
        <button class="orr-button tiny" aria-label="Tiny"></button>
      </div>`);
    const text = await page.evaluate(scanText, { scope: "[data-example]" });
    expect(text.paragraphs, "lone word").toEqual([
      expect.stringContaining("ends on a lone word"),
    ]);
    expect(text.headings, "heading").toEqual([
      expect.stringContaining("one-word line"),
    ]);
    expect(
      text.labels.some((l) => /"Save all changes" wraps to/.test(l)),
      text.labels.join("\n"),
    ).toBe(true);
    expect(
      text.labels.some((l) => /"A long select value" is truncated/.test(l)),
      text.labels.join("\n"),
    ).toBe(true);
    const hits = await page.evaluate(scanHits);
    expect(hits.small).toEqual([
      expect.stringContaining('"Tiny" answers presses over'),
    ]);
    const rings = await tabStops(page);
    expect(rings.stops).toBe(3);
    expect(rings.failures).toEqual([
      expect.stringContaining('"Ring" draws outline none'),
    ]);
  });
});

for (const target of TARGETS) {
  for (const width of WIDTHS) {
    test.describe(`${target.name} at ${width}`, () => {
      // The specimen's hit-area pass probes about 400 elements; it takes 13s on a Mac and passed 30s on CI's runner.
      test.describe.configure({ timeout: 120_000 });
      test.use({ viewport: { width, height: 900 } });
      test.beforeEach(({ page }) => target.open(page));

      test("text: paragraphs end on two words, headings have no one-word line, labels are one whole line", async ({
        page,
      }) => {
        const found = {
          counted: 0,
          paragraphs: [] as string[],
          headings: [] as string[],
          labels: [] as string[],
        };
        for (const frame of documents(page)) {
          const r = await frame.evaluate(scanText, { scope: target.scope });
          found.counted += r.counted;
          found.paragraphs.push(...r.paragraphs);
          found.headings.push(...r.headings);
          found.labels.push(...r.labels);
        }
        test.info().annotations.push({
          type: "checked",
          description: `${found.counted} text elements`,
        });
        expect(found.counted).toBeGreaterThan(0);
        expect.soft(found.paragraphs).toEqual([]);
        expect.soft(found.headings).toEqual([]);
        expect(found.labels).toEqual([]);
      });

      test("focus: every tab stop draws the ring", async ({ page }) => {
        const { stops, failures } = await tabStops(page);
        test.info().annotations.push({
          type: "checked",
          description: `${stops} tab stops`,
        });
        expect(stops).toBeGreaterThan(0);
        expect(failures).toEqual([]);
      });

      test("hit area: every interactive kit element answers presses over --hit-target-min each way", async ({
        page,
      }) => {
        let counted = 0;
        const small: string[] = [];
        for (const frame of documents(page)) {
          const r = await frame.evaluate(scanHits);
          counted += r.counted;
          small.push(...r.small);
        }
        test.info().annotations.push({
          type: "checked",
          description: `${counted} interactive kit elements`,
        });
        expect(counted).toBeGreaterThan(0);
        expect(small).toEqual([]);
      });
    });
  }
}
