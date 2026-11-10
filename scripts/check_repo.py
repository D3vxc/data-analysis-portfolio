"""Repository checks run by CI (.github/workflows/checks.yml). Standard library only.

Run from anywhere:
    python scripts/check_repo.py

Checks:
  1. Every project has an executed notebook, a README and a valid results/summary.json.
  2. Copy follows the house style: no em dashes in the site, resume, READMEs or site scripts.
  3. Every local src/href in docs/*.html points to a file that exists.
  4. docs/CNAME still holds the custom domain.
The "generated data is up to date" check lives in the workflow itself
(rerun scripts/build_site_data.py, then git diff --exit-code docs/data).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
errors: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


# 1. Projects
projects = sorted(p for p in ROOT.glob("[0-9][0-9]-*") if p.is_dir())
if len(projects) < 7:
    fail(f"expected at least 7 project folders, found {len(projects)}")
for p in projects:
    for name in ["README.md", "analysis.ipynb", "results/summary.json"]:
        if not (p / name).exists():
            fail(f"{p.name}: missing {name}")
    summary = p / "results" / "summary.json"
    if summary.exists():
        try:
            json.loads(summary.read_text())
        except json.JSONDecodeError as e:
            fail(f"{p.name}: results/summary.json is not valid JSON ({e})")
    nb = p / "analysis.ipynb"
    if nb.exists():
        try:
            cells = json.loads(nb.read_text())["cells"]
        except (json.JSONDecodeError, KeyError) as e:
            fail(f"{p.name}: analysis.ipynb could not be read ({e})")
            continue
        code = [c for c in cells if c.get("cell_type") == "code" and "".join(c.get("source", [])).strip()]
        unrun = [i for i, c in enumerate(code) if c.get("execution_count") is None]
        if not code:
            fail(f"{p.name}: notebook has no code cells")
        elif unrun:
            fail(f"{p.name}: {len(unrun)} of {len(code)} code cells have not been executed")
        errs = [o for c in code for o in c.get("outputs", []) if o.get("output_type") == "error"]
        if errs:
            fail(f"{p.name}: notebook contains {len(errs)} error output(s)")

# 2. Copy style
copy_files = [DOCS / "index.html", DOCS / "resume.html", ROOT / "README.md",
              *[p / "README.md" for p in projects], *sorted((DOCS / "assets" / "js").glob("*.js"))]
for f in copy_files:
    if not f.exists():
        continue
    for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
        if "—" in line:
            fail(f"{f.relative_to(ROOT)}:{n}: em dash (house style is no em dashes)")

# 3. Local links in the site
attr = re.compile(r'(?:src|href)="([^"]+)"')
for page in sorted(DOCS.glob("*.html")):
    for target in set(attr.findall(page.read_text(encoding="utf-8"))):
        if re.match(r"^(https?:|mailto:|tel:|#|data:|javascript:)", target) or target.startswith("//"):
            continue
        path = target.split("#")[0].split("?")[0]
        if path and not (page.parent / path).exists():
            fail(f"{page.relative_to(ROOT)}: broken local link {target}")

# 4. Custom domain
cname = DOCS / "CNAME"
if not cname.exists() or cname.read_text().strip() != "devmistri.co.uk":
    fail("docs/CNAME must contain devmistri.co.uk")

if errors:
    print(f"{len(errors)} problem(s):")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
print(f"all checks passed ({len(projects)} projects, {len(copy_files)} copy files)")
