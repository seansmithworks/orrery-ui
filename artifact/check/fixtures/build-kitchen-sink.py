"""Build fixtures/kitchen-sink.html: template.html + head.py output + every component preview body. Stdlib only."""
import pathlib, re, subprocess, sys

skill = pathlib.Path(__file__).resolve().parents[2]
snap = skill / "snapshot" / "components"
head = subprocess.run([sys.executable, "-I", str(skill / "head.py")], check=True, capture_output=True, text=True).stdout.rstrip()
page = (skill / "template.html").read_text().replace("<!--HEAD-->", head)

def body(name):
    t = (snap / f"{name}.html").read_text()
    t = t[t.index("<body"):]
    t = t[t.index(">") + 1:]
    t = t[:t.index("<script>/* static preview")]
    return t.strip()

rail = body("RailMode")
m = re.search(r'<main class="os-container">.*</main>', rail, re.S)
main = m.group(0)
extra = ["Answer", "Chip", "Controls", "Fields", "Disclosure", "Grid", "Ledger", "List", "MemoHead", "Navigation",
         "Scale", "Sheet", "Steps", "Table", "Tally", "TextRoles"]
secs = []
for n in extra:
    secs.append(f'<section class="os-sec" id="k-{n.lower()}">\n  <h2 class="os-sh heading">{n}</h2>\n{body(n)}\n</section>')
# insert the component sections before the footer of the rail evidence
marker = '<p class="os-footer'
i = main.index(marker)
main = main[:i] + "\n".join(secs) + "\n" + main[i:]
page = re.sub(r"<main.*</main>", lambda _: main, page, flags=re.S)
page = page.replace("<title>TITLE (2-4 words)</title>", "<title>Kitchen sink</title>")
out = skill / "check" / "fixtures" / "kitchen-sink.html"
out.write_text(page)
print(out, len(page))
