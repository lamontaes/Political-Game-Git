"""Point OPUS-GOV's stopgap rows at their markers' current lines.

Run after editing a file with an SG-GOV-* marker: python3 scripts/research/sync-gov-stopgap-lines.py
"""

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "src/core2/data/stopgaps.json"

rows = json.loads(REGISTRY.read_text())
for row in rows:
    if not row["id"].startswith("SG-GOV-"):
        continue
    lines = (ROOT / row["file"]).read_text().splitlines()
    marker = re.compile(r'stopgap\("' + re.escape(row["id"]) + r'"\)')
    found = [i + 1 for i, line in enumerate(lines) if marker.search(line)]
    if len(found) != 1:
        raise SystemExit(f"{row['id']}: expected one marker in {row['file']}, found {len(found)}")
    row["line"] = found[0]
REGISTRY.write_text(json.dumps(rows, indent=2) + "\n")
print("synced")
