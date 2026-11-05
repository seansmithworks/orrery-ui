"""Print one <style> block: tokens (Artifact contract shape) + bundle.css. Stdlib only."""
import json, re, sys, pathlib

args = sys.argv[1:]
snap = pathlib.Path(__file__).resolve().parent / "snapshot"
brand_file = None
print_tokens = False
while args:
    a = args.pop(0)
    if a == "--snapshot" and args:
        snap = pathlib.Path(args.pop(0))
    elif a == "--brand" and args:
        brand_file = args.pop(0)
    elif a == "--print-tokens":
        print_tokens = True
    else:
        sys.exit("usage: head.py [--snapshot <dir>] [--brand <file>] [--print-tokens]")

ALIAS = re.compile(r"^\{([^}]+)\}$")
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
NAME = re.compile(r"^[a-z0-9-]+$")
FONT = re.compile(r"^[A-Za-z0-9 \-]+$")
FONT_URL = re.compile(r"^https://fonts\.googleapis\.com/css2\?[A-Za-z0-9=:@;&+,.%-]+$")
BRAND_TOKENS = ("accent", "on-accent")
SURFACES = ("page", "layer-1", "layer-2")  # accent must read as a ring and fill against each

def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

def ratio(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)

def apply_brand(tok, path):
    """Validate a brand file (DTCG subset); override accent, on-accent and families.sans in tok. Returns (name, googleFonts url)."""
    def fail(why):
        sys.exit(f"brand: {path}: {why}")

    try:
        b = json.loads(pathlib.Path(path).read_text())
    except (OSError, ValueError) as e:
        fail(f"cannot read: {e}")
    if not isinstance(b, dict):
        fail("top level must be an object")
    for k in b:
        if k not in ("$description", "$extensions", "color", "font"):
            fail(f"unknown path {k}")

    def ext(node, where, allowed):
        e = node.get("$extensions", {})
        if not isinstance(e, dict) or any(k != "com.orrery" for k in e):
            fail(f"{where}$extensions: only com.orrery is allowed")
        o = e.get("com.orrery", {})
        if not isinstance(o, dict) or any(k not in allowed for k in o):
            fail(f"{where}$extensions.com.orrery: allowed keys are {', '.join(allowed)}")
        return o

    name = ext(b, "", ("name",)).get("name")
    if not isinstance(name, str) or not NAME.match(name):
        fail("$extensions.com.orrery.name is required and must match ^[a-z0-9-]+$")

    base = {t["name"]: t["value"] for t in tok["color"]["tokens"]}
    raw = {}
    group = b.get("color")
    if group is not None:
        if not isinstance(group, dict) or group.get("$type") != "color":
            fail('color must be an object with $type "color"')
        for k, node in group.items():
            if k in ("$type", "$description"):
                continue
            if k not in BRAND_TOKENS:
                fail(f"unknown or locked path color.{k} (only accent and on-accent can be set)")
            if not isinstance(node, dict) or "$value" not in node:
                fail(f"color.{k} needs a $value")
            for nk in node:
                if nk not in ("$value", "$type", "$description", "$extensions"):
                    fail(f"unknown path color.{k}.{nk}")
            if node.get("$type", "color") != "color":
                fail(f'color.{k}.$type must be "color"')
            dark = ext(node, f"color.{k}.", ("dark",)).get("dark", node["$value"])
            raw[k] = {"light": node["$value"], "dark": dark}

    sans = url = None
    font = b.get("font")
    if font is not None:
        if not isinstance(font, dict) or font.get("$type") != "fontFamily":
            fail('font must be an object with $type "fontFamily"')
        for k, node in font.items():
            if k in ("$type", "$description"):
                continue
            if k != "sans":
                fail(f"unknown or locked path font.{k} (only sans can be set)")
            if not isinstance(node, dict) or any(nk not in ("$value", "$type", "$description", "$extensions") for nk in node):
                fail("font.sans must be an object with a $value")
            if node.get("$type", "fontFamily") != "fontFamily":
                fail('font.sans.$type must be "fontFamily"')
            v = node.get("$value")
            if not isinstance(v, list) or not v or not all(isinstance(n, str) and FONT.match(n) for n in v):
                fail("font.sans.$value must be a non-empty array of names matching ^[A-Za-z0-9 -]+$")
            sans = ", ".join(f'"{n}"' if " " in n else n for n in v)
            url = ext(node, "font.sans.", ("googleFonts",)).get("googleFonts")
            if url is not None and not (isinstance(url, str) and FONT_URL.match(url)):
                fail("font.sans googleFonts must be a https://fonts.googleapis.com/css2?... URL of plain characters")
    if not raw and sans is None:
        fail("sets nothing: define color.accent, color.on-accent or font.sans")

    vals = {}
    for k, per in raw.items():
        vals[k] = {}
        for th, v in per.items():
            where = f"color.{k} ({th})"
            if not isinstance(v, str):
                fail(f"{where}: value must be a string")
            m = ALIAS.match(v)
            if not m and not HEX.match(v):
                fail(f"{where}: {v!r} is neither #rrggbb nor a {{name}} alias")
            if m:
                t = m.group(1)
                t = t[6:] if t.startswith("color.") else t
                if t == k:
                    fail(f"{where}: alias cycle ({k} refers to itself)")
                v = "{" + t + "}"
            vals[k][th] = v

    def to_hex(v, th, where):
        """One hop: an alias target is a hex-valued brand token or a hex-valued base token."""
        m = ALIAS.match(v)
        if not m:
            return v.lower()
        t = m.group(1)
        if t in vals:
            r = vals[t][th]
        elif t in BRAND_TOKENS or t not in base:
            fail(f"{where}: unknown alias target {{{t}}}")
        else:
            r = base[t].get(th) if isinstance(base[t], dict) else base[t]
        if not isinstance(r, str) or not HEX.match(r):
            fail(f"{where}: alias {{{t}}} must point at a plain #rrggbb colour (no alias-to-alias)")
        return r.lower()

    for th in ("light", "dark"):
        def get(n):
            v = vals[n][th] if n in vals else base[n][th]
            return to_hex(v, th, f"{n} ({th})")
        acc, onacc = get("accent"), get("on-accent")
        if ratio(onacc, acc) < 4.5:
            fail(f"{th} on-accent {onacc} on accent {acc} is {ratio(onacc, acc):.2f}:1, needs 4.5:1")
        for surf in SURFACES:
            sv = get(surf)
            if ratio(acc, sv) < 3.0:
                fail(f"{th} accent {acc} against {surf} {sv} is {ratio(acc, sv):.2f}:1, needs 3:1")

    for t in tok["color"]["tokens"]:
        if t["name"] in vals:
            t["value"] = dict(vals[t["name"]])
    if sans:
        tok["type"]["families"]["sans"] = sans
    return name, url

tok = json.loads((snap / "tokens.json").read_text())
brand = apply_brand(tok, brand_file) if brand_file else None
if print_tokens:
    print(json.dumps(tok, indent=2))
    sys.exit(0)
themes = [t["id"] for t in tok["color"]["themes"]]
first, rest = themes[0], themes[1:]
esc = lambda n: n.replace(".", "\\.")

def cv(x):
    m = ALIAS.match(x)
    return f"var(--{m.group(1)})" if m else x

def decls(th, indent):
    out = []
    for t in tok["color"]["tokens"]:
        v = t["value"] if isinstance(t["value"], dict) else {first: t["value"]}
        if th in v:
            out.append(f"{indent}--{esc(t['name'])}: {cv(v[th])};")
    for t in tok["shadow"]["tokens"]:
        v = t["value"] if isinstance(t["value"], dict) else {first: t["value"]}
        if th in v:
            out.append(f"{indent}--{esc(t['name'])}: {v[th]};")
    return out

known = {"version", "color", "type", "spacing", "radius", "shadow"}
L = ["<style>", "/* Orrery Artifact: generated by head.py from snapshot/tokens.json" + (f" + brand {brand[0]}" if brand else "") + " */"]
if brand and brand[1]:
    L.append(f'@import url("{brand[1]}");')
L.append(":root {")
L += decls(first, "  ")
for fam in ["spacing", "radius"] + [k for k in tok if k not in known]:
    for t in tok[fam]["tokens"]:
        L.append(f"  --{esc(t['name'])}: {t['value']};")
for k, v in tok["type"]["families"].items():
    L.append(f"  --font-{k}: {v};")
L.append(f"  color-scheme: {' '.join(themes)};")
L.append("}")
for th in rest:
    L.append("@media (prefers-color-scheme: %s) {" % th)
    L.append('  :root:not([data-theme="%s"]) {' % first)
    L += decls(th, "    ")
    L.append(f"    color-scheme: {th};")
    L.append("  }")
    L.append("}")
    L.append(':root[data-theme="%s"] {' % th)
    L += decls(th, "  ")
    L.append(f"  color-scheme: {th};")
    L.append("}")
L.append(f':root[data-theme="{first}"] {{ color-scheme: {first}; }}')
L.append("body { background: var(--page); color: var(--text); }")
for g in tok["type"]["groups"]:
    for s in g["styles"]:
        f = s.get("family", g["family"])
        d = [f"font-family: var(--font-{f})", f"font-size: {s['fontSize']}",
             f"line-height: {s['lineHeight']}", f"font-weight: {s['fontWeight']}"]
        if "letterSpacing" in s:
            d.append(f"letter-spacing: {s['letterSpacing']}")
        L.append(f".{esc(s['name'])} {{ " + "; ".join(d) + "; }")
L.append("/* bundle.css */")
L.append((snap / "bundle.css").read_text().rstrip())
L.append("</style>")
print("\n".join(L))
