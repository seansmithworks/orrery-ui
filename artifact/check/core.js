/* Orrery page checker core. Pure in-page DOM code: no Node APIs.
 * Usage: globalThis.orreryCheck(document, opts) -> [{rule, pass, count, items:[{selector, detail}]}]
 * Helpers for interaction runners: orreryCheck.popups, orreryCheck.focus.
 * Judges what renders (getComputedStyle), not the markup. */
(() => {
  const COLOR_TOKENS = [
    "page",
    "layer-1",
    "layer-2",
    "line",
    "line-strong",
    "line-dashed",
    "text",
    "text-muted",
    "accent",
    "on-accent",
    "scale-1",
    "scale-2",
    "scale-3",
    "scale-4",
    "scale-5",
    "scale-1-ink",
    "scale-2-ink",
    "scale-3-ink",
    "scale-4-ink",
    "scale-5-ink",
  ];
  const RULES = [
    "token-colors",
    "literal-values",
    "one-shadow",
    "muted-on-layer2",
    "contrast",
    "fits-window",
    "no-edge-bands",
    "no-emoji-icons",
  ];
  const NAMED = new Set(
    (
      "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet " +
      "brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan " +
      "darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred " +
      "darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue " +
      "dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray " +
      "green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon " +
      "lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon " +
      "lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta " +
      "maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen " +
      "mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab " +
      "orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
      "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna " +
      "silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet " +
      "wheat white whitesmoke yellow yellowgreen"
    ).split(" "),
  );
  const SKIP_LITERAL_PROPS =
    /^(font|font-family|content|quotes|counter-.*|animation|animation-name|transition|transition-property|will-change|src|grid-area|grid-template-areas|grid-template|list-style-type|unicode-range)$/;
  const EMOJI = /\p{Extended_Pictographic}/u;
  const EMOJI_OK = /[©®™]/g; // (c) (r) tm: legal marks in footers, not icons
  const ICON_FONT = /icon|awesome|material symbols/i;

  function orreryCheck(doc, opts = {}) {
    const win = doc.defaultView;
    const root = doc.documentElement;
    const maxItems = opts.maxItems || 40;
    const cs = (el, p) => win.getComputedStyle(el, p);
    const R = {};
    for (const r of RULES) R[r] = { rule: r, pass: true, count: 0, items: [] };
    // Scoped exemption: data-orrery-exempt="rule ..." plus data-orrery-why on an element excludes it and its descendants
    // from the named rules. Only token-colors, literal-values (inline style attrs) and contrast are exemptable. A refused
    // exemption (short reason, oversized host, over 5 hosts, other rules) is ignored and reported as a failing item.
    // Page-local <style> rules can't be exempted. The :root-vs-baseline token check is never exemptable.
    const EXEMPTABLE = ["token-colors", "literal-values", "contrast"];
    const exemptions = [];
    let exemptIdx = 0;
    for (const host of doc.querySelectorAll("[data-orrery-exempt]")) {
      const why = (host.getAttribute("data-orrery-why") || "").trim();
      const named = host.getAttribute("data-orrery-exempt").split(/\s+/).filter((n) => RULES.includes(n));
      // size the host by the union of its own box and every descendant box, so display:contents cannot hide it
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const e of [host, ...host.querySelectorAll("*")]) {
        const b = e.getBoundingClientRect();
        if (!(b.width > 0 && b.height > 0)) continue;
        x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom);
      }
      const r = { width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
      const vw = win.innerWidth, vh = win.innerHeight;
      const refusals = [];
      if (++exemptIdx > 5) refusals.push("more than 5 exempt hosts on the page");
      if (why.replace(/\s/g, "").length < 15 || why.split(/\s+/).length < 3)
        refusals.push("data-orrery-why needs 15+ non-space characters and 3+ words");
      if (host === doc.documentElement || host === doc.body || host.matches("main, article, .os-doc, .os-front, .os-evidence") || r.width * r.height > 0.5 * vw * vh)
        refusals.push("host too large");
      exemptions.push({ host, why, named, refusals, ok: refusals.length === 0 });
    }
    const exemptFor = (el, rule) =>
      typeof el !== "string" &&
      EXEMPTABLE.includes(rule) &&
      exemptions.some((x) => x.ok && x.named.includes(rule) && x.host.contains(el));
    const add = (rule, el, detail, warn, force) => {
      if (!warn && !force && exemptFor(el, rule)) return;
      const r = R[rule];
      if (!warn) {
        r.count++;
        r.pass = false;
      }
      if (r.items.length < maxItems)
        r.items.push({
          selector: typeof el === "string" ? el : sel(el),
          detail: (warn ? "warning: " : "") + detail,
        });
    };

    // ---------- helpers
    function sel(el) {
      const parts = [];
      let e = el;
      for (let i = 0; e && e.nodeType === 1 && i < 3; i++) {
        let p = e.localName;
        if (e.id) {
          parts.unshift(p + "#" + e.id);
          break;
        }
        const cl = (e.getAttribute("class") || "")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2);
        if (cl.length) p += "." + cl.join(".");
        parts.unshift(p);
        if (e === doc.body || e === root) break;
        e = e.parentElement;
      }
      return parts.join(" > ");
    }
    const parseColor = (s) => core.parseColor(doc, s);
    const fmt = (c) =>
      c
        ? `rgb${c[3] < 1 ? "a" : ""}(${c.slice(0, 3).map(Math.round).join(",")}${c[3] < 1 ? "," + +c[3].toFixed(2) : ""})`
        : "?";
    const lum = (c) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    };
    const ratio = (a, b) => {
      const x = lum(a),
        y = lum(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const over = (top, base) => {
      // composite top (with alpha) over opaque base
      const a = top[3];
      return [
        top[0] * a + base[0] * (1 - a),
        top[1] * a + base[1] * (1 - a),
        top[2] * a + base[2] * (1 - a),
        1,
      ];
    };
    const eq = (a, b) =>
      a &&
      b &&
      Math.abs(a[0] - b[0]) < 1.01 &&
      Math.abs(a[1] - b[1]) < 1.01 &&
      Math.abs(a[2] - b[2]) < 1.01 &&
      Math.abs(a[3] - b[3]) < 0.02;

    // Tokens. The baseline is token VALUES (opts.tokens: {name: {light, dark}}), never the page's own :root.
    // The page's resolved :root tokens are read through a probe and must equal the baseline.
    const rootStyle = cs(root);
    const dt = root.getAttribute("data-theme");
    const theme =
      dt === "light" || dt === "dark"
        ? dt
        : win.matchMedia && win.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    const base = opts.tokens || null;
    const names = base ? Object.keys(base) : opts.colorTokens || COLOR_TOKENS;
    const resolveBase = (n, depth = 0) => {
      const e = base[n];
      let v = e && (e[theme] != null ? e[theme] : e.light);
      if (v == null || depth > 8) return null;
      const m = /^\{([^}]+)\}$/.exec(String(v).trim());
      return m ? resolveBase(m[1], depth + 1) : parseColor(String(v));
    };
    const probe = doc.createElement("span");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none";
    (doc.body || root).appendChild(probe);
    const tok = {};
    const pageTok = {};
    for (const n of names) {
      if (rootStyle.getPropertyValue("--" + n).trim()) {
        probe.style.color = "";
        probe.style.color = `var(--${n})`;
        pageTok[n] = parseColor(cs(probe).color);
      }
      tok[n] = base ? resolveBase(n) : pageTok[n];
    }
    probe.remove();
    if (base)
      for (const n of names) {
        if (pageTok[n] && tok[n] && !eq(pageTok[n], tok[n]))
          add("token-colors", root, `--${n} resolves to ${fmt(pageTok[n])}, baseline ${fmt(tok[n])} (${theme})`, false, true);
      }
    const tokenList = Object.entries(tok).filter(([, c]) => c);
    const tokenOf = (c) => {
      for (const [n, t] of tokenList) if (eq(c, t)) return n;
      return null;
    };
    const pageC = tok.page && tok.page[3] === 1 ? tok.page : [255, 255, 255, 1];
    const dark = theme === "dark";

    const isVisible = (el) => {
      if (
        el.checkVisibility &&
        !el.checkVisibility({ visibilityProperty: true })
      )
        return false;
      return true;
    };
    const rectOf = (el) => el.getBoundingClientRect();
    const boxed = (el, s) => {
      if (s.display === "contents") return false;
      const r = rectOf(el);
      return r.width > 0 && r.height > 0;
    };
    const hasOwnText = (el) => {
      for (const n of el.childNodes)
        if (n.nodeType === 3 && n.nodeValue.trim()) return true;
      return false;
    };
    const SKIP = new Set([
      "SCRIPT",
      "STYLE",
      "NOSCRIPT",
      "TEMPLATE",
      "LINK",
      "META",
      "TITLE",
      "HEAD",
      "BR",
      "WBR",
    ]);
    const MEDIA = new Set([
      "IMG",
      "VIDEO",
      "CANVAS",
      "IFRAME",
      "PICTURE",
      "OBJECT",
      "EMBED",
    ]);
    const GFX = new Set([
      "path",
      "circle",
      "rect",
      "line",
      "polyline",
      "polygon",
      "ellipse",
      "text",
      "tspan",
      "use",
    ]);
    const all = [root, ...doc.querySelectorAll("body, body *")].filter(
      (e) => !SKIP.has(e.tagName),
    );

    const { effBg, opacityOf } = core.bgTools(doc, pageC);

    // ---------- token-colors / contrast / muted / bands / emoji: per element
    const checkColor = (el, label, value, rule = "token-colors") => {
      const c = parseColor(value);
      if (!c || c[3] === 0) return;
      if (!tokenOf(c)) add(rule, el, `${label} ${value} is not a token`);
    };
    const SIDES = ["top", "right", "bottom", "left"];
    const sidesOf = (s) =>
      SIDES.map((d) => ({
        d,
        w: parseFloat(s["border-" + d + "-width"]) || 0,
        on:
          (parseFloat(s["border-" + d + "-width"]) || 0) > 0 &&
          !/^(none|hidden)$/.test(s["border-" + d + "-style"]),
        color: s["border-" + d + "-color"],
      }));
    const FORM_TEXT = new Set(["BUTTON", "SELECT", "TEXTAREA", "INPUT"]);
    const checkBox = (el, s, label, ownText) => {
      const bg = parseColor(s.backgroundColor);
      if (bg && bg[3] > 0)
        checkColor(el, label + "background", s.backgroundColor);
      const sides = sidesOf(s);
      for (const b of sides)
        if (b.on) checkColor(el, `${label}border-${b.d}`, b.color);
      if (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0)
        checkColor(el, label + "outline", s.outlineColor);
      if (ownText) checkColor(el, label + "color", s.color);
    };
    const mutedC = tok["text-muted"],
      layer2C = tok["layer-2"];

    // a 2px+ left/right border is a band when the other borders are at most half as wide (or transparent/none)
    const bandSide = (sd, side) => {
      const b = sd.find((x) => x.d === side);
      if (!b.on || b.w < 2) return false;
      const bc = parseColor(b.color);
      if (bc && bc[3] === 0) return false;
      const other = Math.max(
        0,
        ...sd.filter((o) => o.d !== side).map((o) => (o.on && (parseColor(o.color) || [0, 0, 0, 1])[3] > 0 ? o.w : 0)),
      );
      return other * 2 <= b.w;
    };
    // best effort: a horizontal linear-gradient with a hard colour stop within 6px of an edge
    const gradientBand = (img) => {
      if (!img || !/^linear-gradient\(\s*(to (left|right)|-?90deg|270deg)/.test(img)) return null;
      const px = [...img.matchAll(/(-?[\d.]+)px/g)].map((m) => parseFloat(m[1])).filter((v) => v > 0 && v <= 6);
      const hard = px.some((v, i) => px.indexOf(v) !== i) || /\)\s+0(px)?\s+[\d.]+px/.test(img);
      const fromRight = /100%\s*-\s*[\d.]+px/.test(img);
      return (px.length && hard) || fromRight ? img.slice(0, 60) : null;
    };

    for (const el of all) {
      if (!isVisible(el)) continue;
      const s = cs(el);
      const isBox = boxed(el, s);
      const media = MEDIA.has(el.tagName);
      const ownText =
        !media &&
        (hasOwnText(el) ||
          (FORM_TEXT.has(el.tagName) &&
            !/^(checkbox|radio|hidden|range|file|color|image)$/.test(
              el.type || "",
            )));
      const inSvg = el.namespaceURI === "http://www.w3.org/2000/svg";

      if (isBox || el === root) {
        if (!inSvg) checkBox(el, s, "", ownText);
      } else if (ownText && !inSvg) checkColor(el, "color", s.color);

      if (inSvg && GFX.has(el.localName) && isBox) {
        if (s.fill !== "none" && !s.fill.startsWith("url("))
          checkColor(el, "svg fill", s.fill);
        if (
          s.stroke !== "none" &&
          !s.stroke.startsWith("url(") &&
          parseFloat(s.strokeWidth) > 0
        )
          checkColor(el, "svg stroke", s.stroke);
      }

      // pseudo-elements that render
      if (!media && !inSvg)
        for (const pe of ["::before", "::after"]) {
          const ps = cs(el, pe);
          if (
            !ps ||
            ps.content === "none" ||
            ps.content === "normal" ||
            ps.display === "none"
          )
            continue;
          const txt = ps.content.replace(/^["']|["']$/g, "");
          checkBox(
            el,
            ps,
            pe + " ",
            !!txt && !/^(counter|attr)\(/.test(txt) ? true : false,
          );
          if (EMOJI.test(txt.replace(EMOJI_OK, "")))
            add("no-emoji-icons", el, `${pe} content has emoji "${txt}"`);
        }

      // text-only rules
      if (ownText && !media && !inSvg) {
        const r = rectOf(el);
        const sizeOk = r.width > 1.5 && r.height > 1.5 && r.right > 0;
        if (sizeOk && !el.closest(":disabled")) {
          const fg = parseColor(s.color);
          const bgE = effBg(el);
          if (fg && fg[3] > 0) {
            if (
              mutedC &&
              layer2C &&
              eq(fg, mutedC) &&
              !bgE.unknown &&
              eq(bgE.c, layer2C)
            ) {
              add(
                "muted-on-layer2",
                el,
                `text-muted ${fmt(fg)} on layer-2 ${fmt(bgE.c)}`,
              );
            }
            if (!bgE.unknown) {
              const op = opacityOf(el);
              const f = over([fg[0], fg[1], fg[2], fg[3] * op], bgE.c);
              const rt = ratio(f, bgE.c);
              const px = parseFloat(s.fontSize),
                wt = parseInt(s.fontWeight, 10) || 400;
              const large = px >= 24 || (px >= 18.66 && wt >= 700);
              const need = large ? 3 : 4.5;
              if (rt < need - 0.005)
                add(
                  "contrast",
                  el,
                  `ratio ${rt.toFixed(2)} < ${need} (${fmt(f)} on ${fmt(bgE.c)}, ${px}px/${wt}) "${el.textContent.trim().slice(0, 24)}"`,
                );
            }
          }
        }
      }
      if (ownText && !media) {
        // emoji + icon fonts (svg <text> included)
        const own = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.nodeValue)
          .join(" ");
        const stripped = own.replace(EMOJI_OK, "");
        const m = stripped.match(EMOJI);
        if (m)
          add(
            "no-emoji-icons",
            el,
            `emoji U+${m[0].codePointAt(0).toString(16).toUpperCase()} in "${own.trim().slice(0, 24)}"`,
          );
        if (ICON_FONT.test(s.fontFamily))
          add("no-emoji-icons", el, `icon font ${s.fontFamily}`);
      }
      if (el.localName === "i" && /icon/i.test(el.getAttribute("class") || ""))
        add("no-emoji-icons", el, "icon element <i class*=icon>");
      for (const a of ["placeholder", "value", "aria-label", "title", "alt"]) {
        const v = el.getAttribute && el.getAttribute(a);
        if (
          v &&
          EMOJI.test(v.replace(EMOJI_OK, "")) &&
          !(a === "value" && el.tagName !== "INPUT")
        )
          add("no-emoji-icons", el, `emoji in ${a}="${v.slice(0, 24)}"`);
      }
      if (el.localName === "svg" && el.closest("button, a") && isBox) {
        add(
          "no-emoji-icons",
          el,
          "inline svg inside " +
            el.closest("button, a").localName +
            " (review: icons are off-system)",
          true,
        );
      }

      // edge bands (own borders)
      if (isBox) {
        const sd = sidesOf(s);
        const by = Object.fromEntries(sd.map((b) => [b.d, b]));
        for (const side of ["left", "right"])
          if (bandSide(sd, side)) add("no-edge-bands", el, `${side} border ${by[side].w}px next to thinner/no borders`);
        const gb = gradientBand(s.backgroundImage);
        if (gb) add("no-edge-bands", el, `gradient side bar (${gb})`);
        // pinned bar: absolutely positioned 2-6px wide strip on a parent's side edge
        if (s.position === "absolute" || s.position === "fixed")
          bandBar(el, el, s);
      }
      for (const pe of ["::before", "::after"]) {
        const ps = cs(el, pe);
        if (
          ps &&
          ps.content !== "none" &&
          ps.content !== "normal" &&
          ps.position === "absolute"
        ) {
          const sd = sidesOf(ps);
          for (const side of ["left", "right"])
            if (bandSide(sd, side)) add("no-edge-bands", el, `${pe} ${side} border next to thinner/no borders`);
          bandBar(el, null, ps, pe);
        }
      }
    }
    function bandBar(host, self, s, pe) {
      const bg = parseColor(s.backgroundColor);
      if (!bg || bg[3] === 0) return;
      const w = parseFloat(s.width),
        h = parseFloat(s.height);
      if (!(w >= 2 && w <= 6)) return;
      const parent = self ? self.parentElement : host;
      if (!parent) return;
      const pr = rectOf(parent);
      if (isNaN(h) || pr.height <= 0 || h < pr.height * 0.6) return;
      const l = parseFloat(s.left),
        rt = parseFloat(s.right);
      const pinned =
        (!isNaN(l) &&
          Math.abs(l) <= 1 &&
          (s.right === "auto" || rt > pr.width - w - 2)) ||
        (!isNaN(rt) &&
          Math.abs(rt) <= 1 &&
          (s.left === "auto" || l > pr.width - w - 2));
      if (self) {
        const r = rectOf(self);
        if (
          Math.abs(r.left - pr.left) <= 1.5 ||
          Math.abs(r.right - pr.right) <= 1.5
        )
          return add(
            "no-edge-bands",
            self,
            `${w}px bar pinned to the side of its parent`,
          );
      } else if (pinned)
        add("no-edge-bands", host, `${pe} ${w}px bar pinned to the side`);
    }

    // ---------- literal-values (static scan)
    const stripVars = (v) =>
      v
        .replace(/var\(\s*--[\w-]+\s*\)/g, " ")
        .replace(/var\(\s*--[\w-]+\s*,/g, "(");
    const decls = (css) => {
      // [{prelude, prop, value}]
      const out = [];
      css = css.replace(/\/\*[\s\S]*?\*\//g, "");
      let depthP = 0,
        quote = "",
        seg = "",
        prelude = "",
        depthB = 0;
      for (let i = 0; i < css.length; i++) {
        const ch = css[i];
        if (quote) {
          seg += ch;
          if (ch === quote && css[i - 1] !== "\\") quote = "";
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          seg += ch;
          continue;
        }
        if (ch === "(") depthP++;
        if (ch === ")") depthP--;
        if (depthP === 0 && (ch === "{" || ch === "}" || ch === ";")) {
          if (ch === "{") {
            prelude = seg.trim();
            depthB++;
          } else if (depthB > 0) {
            const k = seg.indexOf(":");
            if (k > 0)
              out.push({
                prelude,
                prop: seg.slice(0, k).trim().toLowerCase(),
                value: seg.slice(k + 1).trim(),
              });
            if (ch === "}") depthB--;
          }
          seg = "";
          continue;
        }
        seg += ch;
      }
      return out;
    };
    const literalsIn = (prop, value) => {
      const found = [];
      const v = stripVars(value)
        .replace(/url\([^)]*\)/gi, " ")
        .replace(/(["'])(?:\\.|(?!\1).)*\1/g, " ");
      if (!SKIP_LITERAL_PROPS.test(prop)) {
        for (const m of v.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) found.push(m[0]);
        for (const m of v.matchAll(
          /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(([^)]*)\)/gi,
        ))
          if (/\d/.test(m[2])) found.push(m[0]);
        for (const m of v.matchAll(/(?<![\w-])([a-z]+)(?![\w(-])/gi))
          if (NAMED.has(m[1].toLowerCase())) found.push(m[1]);
      }
      if (
        (prop === "box-shadow" || prop === "-webkit-box-shadow") &&
        !/^(none|inherit|initial|unset|var\(\s*--[\w-]+\s*\))$/i.test(
          value.trim(),
        )
      )
        found.push(value.trim());
      return found;
    };
    const normCss = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
    const headNorm = (opts.headBlocks || []).map(normCss);
    let styleIdx = 0;
    for (const st of doc.querySelectorAll("style")) {
      styleIdx++;
      const text = st.textContent || "";
      // exempt only a block identical (comments and whitespace aside) to head.py's output for the baseline tokens
      const isHead = normCss(text) !== "" && headNorm.includes(normCss(text));
      if (isHead) continue;
      const label =
        `style[${styleIdx}]` + (/page-local/i.test(text) ? " page-local" : "");
      for (const d of decls(text))
        for (const f of literalsIn(d.prop, d.value))
          add(
            "literal-values",
            label,
            `${d.prelude.slice(0, 40)} { ${d.prop}: ${f} }`,
          );
    }
    for (const el of doc.querySelectorAll("[style]")) {
      for (const d of decls("x{" + el.getAttribute("style") + "}"))
        for (const f of literalsIn(d.prop, d.value))
          add("literal-values", el, `style="${d.prop}: ${f}"`);
    }

    // ---------- one-shadow
    const shadowLayers = (v) => {
      const out = [];
      let depth = 0,
        cur = "";
      for (const ch of v) {
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (ch === "," && depth === 0) {
          out.push(cur);
          cur = "";
        } else cur += ch;
      }
      if (cur.trim()) out.push(cur);
      return out;
    };
    // a panel hairline: zero offset, zero blur, spread <= 2px, in the --line color. Anything else is a shadow.
    const hairline = (l) => {
      const n = [...l.matchAll(/(-?[\d.]+)px/g)].map((m) => parseFloat(m[1]));
      const col = l.match(/rgba?\([^)]*\)|color\([^)]*\)/);
      return n[0] === 0 && n[1] === 0 && (n[2] || 0) === 0 && (n[3] || 0) <= 2 && col && tok.line && eq(parseColor(col[0]), tok.line);
    };
    const realShadow = (v) => v && v !== "none" && shadowLayers(v).some((l) => !hairline(l));
    const shadowKinds = (el) => {
      const s = cs(el), out = [];
      if (realShadow(s.boxShadow)) out.push(`box-shadow ${s.boxShadow}`);
      if (s.textShadow && s.textShadow !== "none") out.push(`text-shadow ${s.textShadow}`);
      if (/drop-shadow\(/.test(s.filter || "")) out.push(`filter ${s.filter}`);
      if (/drop-shadow\(/.test(s.backdropFilter || "")) out.push(`backdrop-filter ${s.backdropFilter}`);
      return out;
    };
    const shadowEls = all.map((el) => [el, shadowKinds(el)]).filter(([, k]) => k.length);
    const lifts = shadowEls.filter(([e]) => e.matches(".os-decisions.os-lift")).length;
    for (const [el, kinds] of shadowEls) {
      const onlyBox = kinds.length === 1 && kinds[0].startsWith("box-shadow");
      const allowed = !dark && onlyBox && el.matches(".os-decisions.os-lift") && lifts === 1;
      if (!allowed)
        add("one-shadow", el, kinds.join("; ") + (dark ? " (dark theme allows none)" : " (only one .os-decisions.os-lift allowed)"));
    }

    // ---------- fits-window
    const iw = win.innerWidth;
    if (iw <= (opts.mobileMax || 600)) {
      const clips = (e) => /^(auto|scroll|hidden|clip)$/.test(cs(e).overflowX);
      const hides = [root, doc.body].some((e) => e && /^(hidden|clip)$/.test(cs(e).overflowX));
      const origins = [];
      for (const el of all) {
        if (el === root || el === doc.body || !isVisible(el)) continue;
        const r = rectOf(el);
        if (r.width === 0 || r.right <= iw + 0.5) continue;
        const p = el.parentElement;
        let blocked = false;
        for (let e = el.parentElement; e && e !== doc.body && e !== root; e = e.parentElement)
          if (clips(e)) { blocked = true; break; }
        if (blocked) continue;
        if (p && p !== doc.body && rectOf(p).right > iw + 0.5) continue; // an ancestor is the origin
        origins.push({ selector: sel(el), detail: `right edge ${Math.round(r.right)} > ${iw}` });
      }
      const scrolls = root.scrollWidth > iw + 0.5;
      if (scrolls) add("fits-window", root, `scrollWidth ${root.scrollWidth} > innerWidth ${iw}`);
      else if (hides && origins.length) add("fits-window", root, `overflow-x hidden/clip on html or body cuts off content (${origins.length} element(s) past ${iw})`);
      if (scrolls || (hides && origins.length))
        for (const o of origins.slice(0, 8)) if (R["fits-window"].items.length < maxItems) R["fits-window"].items.push(o);
    }

    for (const x of exemptions)
      for (const n of x.named) {
        const refusals = [...x.refusals, ...(EXEMPTABLE.includes(n) ? [] : [`${n} is not exemptable`])];
        if (refusals.length) add(n, x.host, `exemption refused: ${refusals.join("; ")}`, false, true);
        else if (R[n].items.length < maxItems) R[n].items.push({ selector: sel(x.host), detail: `warning: exempted (${x.why})` });
      }

    return RULES.map((r) => R[r]);
  }

  // ---------- shared helpers exposed to runners
  const core = {
    over(top, base) {
      const a = top[3];
      return [top[0] * a + base[0] * (1 - a), top[1] * a + base[1] * (1 - a), top[2] * a + base[2] * (1 - a), 1];
    },
    pageColor(doc) {
      const probe = doc.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden";
      (doc.body || doc.documentElement).appendChild(probe);
      probe.style.color = "var(--page)";
      const c = core.parseColor(doc, doc.defaultView.getComputedStyle(probe).color);
      probe.remove();
      return c && c[3] === 1 ? c : [255, 255, 255, 1];
    },
    // effective background (composite of ancestors) and cumulative opacity, memoised
    bgTools(doc, pageC) {
      const win = doc.defaultView, root = doc.documentElement, bgMemo = new Map(), opMemo = new Map();
      const effBg = (el) => {
        if (!el || el.nodeType !== 1) return { c: pageC, unknown: false };
        if (bgMemo.has(el)) return bgMemo.get(el);
        const s = win.getComputedStyle(el);
        const own = core.parseColor(doc, s.backgroundColor) || [0, 0, 0, 0];
        const img = s.backgroundImage && s.backgroundImage !== "none";
        let out;
        if (own[3] >= 0.999 && !img) out = { c: own, unknown: false };
        else {
          const below = el === root ? { c: pageC, unknown: false } : effBg(el.parentElement);
          out = { c: own[3] > 0 ? core.over(own, below.c) : below.c, unknown: below.unknown || !!img };
        }
        bgMemo.set(el, out);
        return out;
      };
      const opacityOf = (el) => {
        if (!el || el.nodeType !== 1) return 1;
        if (opMemo.has(el)) return opMemo.get(el);
        const v = parseFloat(win.getComputedStyle(el).opacity);
        const o = (isNaN(v) ? 1 : v) * opacityOf(el.parentElement);
        opMemo.set(el, o);
        return o;
      };
      return { effBg, opacityOf };
    },
    parseColor(doc, s) {
      if (!s) return null;
      s = s.trim();
      let m = s.match(
        /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/,
      );
      if (m)
        return [
          +m[1],
          +m[2],
          +m[3],
          m[4] == null
            ? 1
            : m[4].endsWith("%")
              ? parseFloat(m[4]) / 100
              : parseFloat(m[4]),
        ];
      m = s.match(
        /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\)$/,
      );
      if (m)
        return [
          m[1] * 255,
          m[2] * 255,
          m[3] * 255,
          m[4] == null
            ? 1
            : m[4].endsWith("%")
              ? parseFloat(m[4]) / 100
              : parseFloat(m[4]),
        ];
      m = s.match(/^#([0-9a-f]{3,8})$/i);
      if (m && [3, 4, 6, 8].includes(m[1].length)) {
        let h = m[1];
        if (h.length < 5) h = h.replace(/./g, "$&$&");
        return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1);
      }
      if (s === "transparent") return [0, 0, 0, 0];
      try {
        // oklch(), lab() and friends: let canvas convert
        const c = doc.createElement("canvas");
        c.width = c.height = 1;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.fillStyle = "#010203";
        g.fillStyle = s;
        g.fillRect(0, 0, 1, 1);
        const d = g.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      } catch (e) {
        return null;
      }
    },
  };

  // Popups: snapshot what is visible, act (click), then list newly visible floating elements outside the viewport gutter.
  orreryCheck.popups = {
    triggerSelector:
      '[aria-haspopup]:not([aria-haspopup="false"]), [aria-expanded="false"], summary',
    // aria/summary triggers (up to 40) plus plain buttons (up to 25; not submit buttons in forms), in document order
    visibleTriggers(doc) {
      const shown = (e) => {
        if (e.checkVisibility && !e.checkVisibility({ visibilityProperty: true })) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && !e.closest(":disabled");
      };
      const aria = new Set([...doc.querySelectorAll(this.triggerSelector)].filter(shown).slice(0, 40));
      const btns = new Set(
        [...doc.querySelectorAll("button")].filter((b) => shown(b) && !(b.type === "submit" && b.form)).slice(0, 25),
      );
      return [...doc.querySelectorAll("body *")].filter((e) => aria.has(e) || btns.has(e));
    },
    // how many elements became visible since snapshot()
    shownSince(doc) {
      const w = doc.defaultView, before = w.__orreryShown || new w.WeakSet();
      let n = 0;
      for (const e of doc.querySelectorAll("body, body *")) {
        if (before.has(e)) continue;
        if (e.checkVisibility && !e.checkVisibility({ visibilityProperty: true })) continue;
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) n++;
      }
      return n;
    },
    snapshot(doc) {
      const w = doc.defaultView,
        set = new w.WeakSet();
      for (const e of doc.querySelectorAll("body, body *"))
        if (
          !e.checkVisibility ||
          e.checkVisibility({ visibilityProperty: true })
        ) {
          const r = e.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) set.add(e);
        }
      w.__orreryShown = set;
    },
    offscreen(doc, gutter = 8) {
      const w = doc.defaultView,
        before = w.__orreryShown || new w.WeakSet(),
        out = [];
      const iw = w.innerWidth,
        ih = w.innerHeight;
      for (const e of doc.querySelectorAll("body, body *")) {
        if (before.has(e)) continue;
        if (
          e.checkVisibility &&
          !e.checkVisibility({ visibilityProperty: true })
        )
          continue;
        const r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0)) continue;
        const pos = w.getComputedStyle(e).position;
        if (!(
          pos === "fixed" ||
          pos === "absolute" ||
          e.matches("[popover], dialog[open], [role=menu], [role=listbox]")
        ))
          continue;
        // a full-viewport fixed layer (lightbox, scrim) is edge to edge by design, not off-screen
        if (pos === "fixed" && Math.abs(r.left) <= 0.5 && Math.abs(r.top) <= 0.5 && Math.abs(r.right - iw) <= 0.5 && Math.abs(r.bottom - ih) <= 0.5) continue;
        const bad = [];
        if (r.left < gutter - 0.5)
          bad.push(`left ${Math.round(r.left)} < ${gutter}`);
        if (r.right > iw - gutter + 0.5)
          bad.push(`right ${Math.round(r.right)} > ${iw - gutter}`);
        if (pos === "fixed" || e.matches("dialog[open], [popover]")) {
          if (r.top < gutter - 0.5)
            bad.push(`top ${Math.round(r.top)} < ${gutter}`);
          if (r.bottom > ih - gutter + 0.5)
            bad.push(`bottom ${Math.round(r.bottom)} > ${ih - gutter}`);
        }
        if (bad.length)
          out.push({
            selector: orreryCheck.selector(doc, e),
            detail: `opened popup outside viewport: ${bad.join(", ")} (${pos})`,
          });
      }
      return out;
    },
  };

  // Focus ring contrast for the currently focused element (the runner Tabs; this judges one stop).
  orreryCheck.focus = (doc, el) => {
    const win = doc.defaultView;
    el = el || doc.activeElement;
    if (!el || el === doc.body || el === doc.documentElement) return null;
    // the ring may sit on a label or row rather than on a visually hidden input
    const hasRing = (e) => {
      const st = win.getComputedStyle(e), r = e.getBoundingClientRect();
      return st.outlineStyle !== "none" && parseFloat(st.outlineWidth) > 0 && parseFloat(st.opacity) > 0 && r.width > 2 && r.height > 2;
    };
    const next = el.nextElementSibling;
    const host = [el, ...(el.labels || []), next && next.localName === "label" ? next : null, el.closest("label"), el.closest(".os-check, .os-choice, .os-seg")]
      .filter(Boolean).find(hasRing);
    const selector = orreryCheck.selector(doc, el);
    if (!host) return { selector, ring: false };
    const s = win.getComputedStyle(host);
    const ring = core.parseColor(doc, s.outlineColor);
    const pageC = core.pageColor(doc);
    const { effBg } = core.bgTools(doc, pageC);
    const offset = parseFloat(s.outlineOffset) || 0, w = parseFloat(s.outlineWidth) || 2;
    // sample what sits behind the ring at the midpoint of each side: that is the surface the ring must stand out from
    const r = host.getBoundingClientRect(), d = offset + w / 2;
    const pts = [[r.left + r.width / 2, r.top - d], [r.right + d, r.top + r.height / 2], [r.left + r.width / 2, r.bottom + d], [r.left - d, r.top + r.height / 2]];
    let bgs = [];
    if (offset >= 0) for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) continue;
      const under = doc.elementFromPoint(x, y);
      if (under) bgs.push(effBg(under === host || host.contains(under) ? host.parentElement || host : under));
    }
    if (!bgs.length) bgs = [effBg(offset < 0 ? host : host.parentElement || host)];
    if (bgs.some((b) => b.unknown)) return { selector, ring: true, unknown: true };
    const L = (c) => { const g = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * g(c[0]) + 0.7152 * g(c[1]) + 0.0722 * g(c[2]); };
    let worst = Infinity;
    for (const b of bgs) {
      const f = core.over(ring, b.c), x = L(f), y = L(b.c);
      worst = Math.min(worst, (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05));
    }
    return { selector, ring: true, ratio: worst, ok: worst >= 3, detail: `focus ring ${worst.toFixed(2)}:1 (need 3:1) against the surface around ${selector}` };
  };

  orreryCheck.selector = (doc, el) => {
    const parts = [];
    let e = el;
    for (let i = 0; e && e.nodeType === 1 && i < 3; i++) {
      let p = e.localName;
      if (e.id) {
        parts.unshift(p + "#" + e.id);
        break;
      }
      const cl = (e.getAttribute("class") || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);
      if (cl.length) p += "." + cl.join(".");
      parts.unshift(p);
      if (e === doc.body || e === doc.documentElement) break;
      e = e.parentElement;
    }
    return parts.join(" > ");
  };
  orreryCheck.RULES = RULES;
  globalThis.orreryCheck = orreryCheck;
})();
