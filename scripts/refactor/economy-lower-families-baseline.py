#!/usr/bin/env python3
"""Lower tests/guards/families-baseline.json to what the families guard now
reads, after a change moves files between families. It only ever lowers a
count (the guard's own rule); a file that is over its baseline is reported and
nothing is written. Re-runnable."""
import json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE = ROOT / "tests/guards/families-baseline.json"
run = subprocess.run(
    ["npx", "vitest", "run", "tests/guards/families.test.ts"],
    cwd=ROOT, capture_output=True, text=True, env={**__import__("os").environ, "NO_COLOR": "1", "FORCE_COLOR": "0"},
)
out = run.stdout + run.stderr
over = re.findall(r"imports inside other families, \d+ known", out)
if over:
    print("a file reaches further in than its baseline; fix the import, not the baseline:", over[:3])
    sys.exit(1)
lower = re.findall(r'"(src/[^"]+): lower (\d+) to (\d+)"', out)
base = json.loads(BASE.read_text())
for file, was, now in lower:
    have = base["deepImports"].get(file)
    assert have == int(was), (file, have, was)
    if int(now) == 0:
        del base["deepImports"][file]
    else:
        base["deepImports"][file] = int(now)
    print(f"lowered {file}: {was} to {now}")
BASE.write_text(json.dumps(base, indent=2) + "\n")
print(f"{len(lower)} count(s) lowered")
