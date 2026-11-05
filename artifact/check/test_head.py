"""head.py brand layer tests. Stdlib only: python3 -I check/test_head.py (HEAD_BEFORE=<pre-change output> adds the byte-identity test)."""
import json, os, pathlib, subprocess, sys, tempfile, unittest

skill = pathlib.Path(__file__).resolve().parents[1]
head = skill / "head.py"
brands = skill / "check" / "fixtures" / "brands"
example = skill / "brands" / "example.tokens.json"

def run(*args):
    return subprocess.run([sys.executable, "-I", str(head), *map(str, args)], capture_output=True, text=True)

class Head(unittest.TestCase):
    @unittest.skipUnless(os.environ.get("HEAD_BEFORE"), "HEAD_BEFORE not set")
    def test_unbranded_byte_identical(self):
        self.assertEqual(run().stdout, pathlib.Path(os.environ["HEAD_BEFORE"]).read_text())

    def test_branded_values(self):
        out = run("--brand", brands / "test.tokens.json")
        self.assertEqual(out.returncode, 0, out.stderr)
        css = out.stdout
        self.assertIn("+ brand northwind-kiln", css)
        self.assertNotIn("@import", css)
        root = css[css.index(":root {"):css.index("}")]
        self.assertIn("--accent: #1f5f8b;", root)
        self.assertIn("--on-accent: #ffffff;", root)
        self.assertIn('--font-sans: "Source Sans 3", system-ui, sans-serif;', root)
        dark = css[css.index(':root[data-theme="dark"]'):]
        self.assertIn("--accent: #5aa0e0;", dark)
        self.assertIn("--on-accent: var(--page);", dark)
        media = css[css.index("@media (prefers-color-scheme: dark)"):]
        self.assertIn("--accent: #5aa0e0;", media)

    def test_google_fonts_import_is_text(self):
        css = run("--brand", example).stdout
        lines = css.splitlines()
        self.assertTrue(lines[2].startswith('@import url("https://fonts.googleapis.com/css2?family=Source+Sans+3'), lines[2])

    def test_print_tokens(self):
        out = run("--brand", brands / "test.tokens.json", "--print-tokens")
        self.assertEqual(out.returncode, 0, out.stderr)
        t = json.loads(out.stdout)
        by = {x["name"]: x["value"] for x in t["color"]["tokens"]}
        self.assertEqual(by["accent"], {"light": "#1f5f8b", "dark": "#5aa0e0"})
        self.assertEqual(by["on-accent"], {"light": "#ffffff", "dark": "{page}"})
        self.assertEqual(by["layer-1"]["light"], "#f7f7f8")
        self.assertIn("Source Sans 3", t["type"]["families"]["sans"])

    def test_bad_brands_exit_1_naming_the_file(self):
        for name in ("locked-override", "low-contrast", "unknown-path", "bad-font-url", "alias-chain", "alias-cycle"):
            p = brands / f"{name}.tokens.json"
            out = run("--brand", p)
            self.assertEqual(out.returncode, 1, name)
            self.assertTrue(out.stderr.startswith(f"brand: {p}:"), out.stderr)
            self.assertEqual(out.stdout, "", name)

    def test_inline_bad_values(self):
        base = json.loads((brands / "test.tokens.json").read_text())
        cases = {
            "name": lambda b: b["$extensions"]["com.orrery"].update(name="Bad Name"),
            "font name": lambda b: b["font"]["sans"].update({"$value": ['x"; } body{']}),
            "color type": lambda b: b["color"].update({"$type": "dimension"}),
            "hex": lambda b: b["color"]["accent"].update({"$value": "red"}),
            "font url full match": lambda b: b["font"]["sans"].update({"$extensions": {"com.orrery": {"googleFonts": "https://fonts.googleapis.com/css2?family=A\n"}}}),
        }
        for label, f in cases.items():
            b = json.loads(json.dumps(base))
            f(b)
            with tempfile.TemporaryDirectory() as d:
                p = pathlib.Path(d) / "b.tokens.json"
                p.write_text(json.dumps(b))
                out = run("--brand", p)
                self.assertEqual(out.returncode, 1, label)
                self.assertIn(str(p), out.stderr, label)

if __name__ == "__main__":
    unittest.main()
