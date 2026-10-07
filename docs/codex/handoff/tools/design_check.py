"""Pre-merge design check (owner, Oct 1 2026, 5:0x p.m.: "make sure systems aren't being hardcoded and aren't
being duplicated before merge. You are the only line of defense").

Reads the PR's real change (origin/main...head, local git; GitHub as fallback). No tests run. Reports:
  1. HARD-CODED: added lines in game code (not tests, data rows, catalogs or docs) that name a specific law
     question or a specific state/place code. Laws and places are data; code handles a KIND.
  2. NEW PATHS: new game-code files and new exported functions. Each must REPLACE an old path, never sit beside it.
Exit 1 when either list is non-empty and the approval text lacks the matching justification:
  hard-coded hits need "Hardcode-ok: <why this one line must name it>"
  new paths need "Replaces: <the old path removed or why nothing existed>"
Usage: design_check.py <pr> "<approval text>"
"""
import json, re, subprocess, sys

R = "lamontaes/Political-Game-Git"
pr, text = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "")
# Oct 2: GitHub's PR diff goes stale when a branch merges main in (#2003 showed 56 files for a 4-file change),
# so read the real change locally: origin/main...PR head in the /tmp/wt-play worktree. Fall back to GitHub.
WT = "/tmp/wt-play"
def _git(*a): return subprocess.run(["git", "-C", WT, *a], capture_output=True)
ok = _git("fetch", "-q", "origin", "main", f"pull/{pr}/head:dc-pr{pr}").returncode == 0
if ok:
    _git("fetch", "-q", "origin", "main")
    diff = _git("diff", f"origin/main...dc-pr{pr}").stdout.decode("utf-8", errors="replace")
    files = []
    for ln in _git("diff", "--numstat", f"origin/main...dc-pr{pr}").stdout.decode("utf-8", errors="replace").splitlines():
        a, d, path = (ln.split("\t") + ["", "", ""])[:3]
        files.append({"path": path, "additions": int(a) if a.isdigit() else 0, "deletions": int(d) if d.isdigit() else 0})
else:
    diff = subprocess.run(["gh", "pr", "diff", pr, "--repo", R], capture_output=True).stdout.decode("utf-8", errors="replace")  # research captures can hold non-UTF-8 bytes
    files = json.loads(subprocess.run(["gh", "pr", "view", pr, "--repo", R, "--json", "files"], capture_output=True, text=True).stdout or "{}").get("files", [])


def is_game_code(path):
    if not path.startswith("src/") or not path.endswith((".ts", ".tsx")): return False
    if re.search(r"\.test\.tsx?$|/__tests__/|fixture|/data/|-data\.ts$|catalog|policy-pack|/research/|\.generated\.|^src/source/domains/", path): return False  # generated packs and sourced-law domains are data
    return True


HARD = re.compile(r"us-policy-positions:[a-z]|[\"'`]US-[A-Z]{2}[\"'`]|[\"'`](?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|PR|GU|VI|AS|MP)[\"'`]")
EXPORT = re.compile(r"^\+\s*export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z0-9_]+)")
# A JSON import without `with { type: "json" }` breaks Node's loader (every Playwright spec, Oct 1 after #1746).
JSON_IMPORT = re.compile(r"^\+\s*import\s[^;]*from\s+[\"'][^\"']+\.json[\"']\s*;?\s*$")
# Owner, Oct 2 ~11:00: no placeholder numbers, names or events; that is still a gate.
PLACE = re.compile(r"(?i)placeholder|stand-?in|dummy|lorem|\bTBD\b|john doe|jane doe|[\"'`](?:unknown|untitled|example|test) ")
NUM = re.compile(r"(?<![\w.])(\d[\d_]*\.?\d*)(?![\w])")
CAL = {"0", "1", "2", "3", "4", "7", "10", "12", "24", "26", "52", "60", "100", "365", "365.25", "1000", "0.5"}
hard, exports, bare_json, cur = [], [], [], None
place, nums = [], []
for line in diff.splitlines():
    if line.startswith("+++ b/"): cur = line[6:]; continue
    if not cur or not cur.startswith("src/") or not line.startswith("+") or line.startswith("+++"): continue
    if JSON_IMPORT.match(line): bare_json.append(f"{cur}: {line[1:].strip()[:140]}")
    if not is_game_code(cur): continue
    if HARD.search(line) and not line.lstrip("+ ").startswith(("//", "*", "/*")): hard.append(f"{cur}: {line[1:].strip()[:140]}")
    body = line[1:].strip()
    if not body.startswith(("//", "*", "/*")):
        if PLACE.search(body): place.append(f"{cur}: {body[:140]}")
        if any(x not in CAL for x in NUM.findall(body)) and not re.search(r"import |FORMAT_VERSION|\[\d+\]|\.slice\(|toFixed|padStart", body): nums.append(f"{cur}: {body[:140]}")
    m = EXPORT.match(line)
    if m: exports.append(f"{cur}: {m.group(1)}")
new_files = [f["path"] for f in files if is_game_code(f["path"]) and f.get("deletions", 0) == 0 and f.get("additions", 0) > 0
             and subprocess.run(["gh", "api", f"repos/{R}/contents/{f['path']}?ref=main"], capture_output=True).returncode != 0]
add = sum(f.get("additions", 0) for f in files if is_game_code(f["path"])); dele = sum(f.get("deletions", 0) for f in files if is_game_code(f["path"]))
print(f"DESIGN CHECK #{pr}: game code +{add} -{dele}")
for h in hard: print("  HARD-CODED?", h)
for n in new_files: print("  NEW FILE", n)
for e in exports: print("  NEW EXPORT", e)
for x in place: print("  PLACEHOLDER?", x)
for x in nums: print("  NUMBER? (must come from records or game averages)", x)
for j in bare_json: print("  JSON IMPORT WITHOUT `with { type: \"json\" }`", j)
# Oct 2: two release notes without a header turned main's release:check red (#1989, #2010).
notes = [f["path"] for f in files if f["path"].startswith("docs/release/changes/") and f["path"].endswith(".md") and f.get("additions", 0) > 0]
bad_notes = []
if notes:
    head_sha = subprocess.run(["gh", "pr", "view", pr, "--repo", R, "--json", "headRefOid", "--jq", ".headRefOid"], capture_output=True, text=True).stdout.strip()
    for n in notes:
        body = subprocess.run(["gh", "api", f"repos/{R}/contents/{n}?ref={head_sha}", "-H", "Accept: application/vnd.github.raw"], capture_output=True, text=True).stdout
        top = body.split("\n---", 1)[0] if body.startswith("---") else ""
        # scripts/release/declarations.ts: id + impact always; impact:none must NOT carry section/title;
        # any other impact MUST carry a section. (Oct 2: I wrongly forced section onto impact:none notes.)
        none = "impact: none" in top
        if not ("id:" in top and "impact:" in top) or (none and "section:" in top) or (not none and "section:" not in top):
            bad_notes.append(n)
for n in bad_notes: print("  RELEASE NOTE HEADER WRONG (id+impact; section only when impact is not none):", n)
bad = False
if bad_notes: print("  REFUSED: release note header must have id and impact; impact:none carries NO section, any other impact needs one (main's release:check)"); bad = True
if bare_json: print("  REFUSED: add `with { type: \"json\" }` to every JSON import (Node and Playwright can't load it otherwise)"); bad = True
if hard and "Hardcode-ok:" not in text: print("  REFUSED: hard-coded law/place names in game code; add 'Hardcode-ok: <why>' only if truly required"); bad = True
if place and "Placeholder-ok:" not in text: print("  REFUSED: placeholder in game code; the owner bans placeholder numbers, names and events"); bad = True
if nums and "Numbers-ok:" not in text: print("  REFUSED: new literal numbers in game code; confirm each is a fact (calendar, law, unit) with 'Numbers-ok: <what each is>' or send it back"); bad = True
if (new_files or exports) and "Replaces:" not in text: print("  REFUSED: new paths added; say what each replaces with 'Replaces: <old path removed>' (one path per job, no duplicates)"); bad = True
sys.exit(1 if bad else 0)
