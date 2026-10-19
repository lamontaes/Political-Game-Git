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
    if not row["id"].startswith("SG-GOV-") or row.get("status") == "resolved":
        continue
    lines = (ROOT / row["file"]).read_text().splitlines()
    # A code marker, or a data row naming it (law-reach effect tables).
    marker = re.compile(
        r'stopgap\("' + re.escape(row["id"]) + r'"\)|"stopgapId": "' + re.escape(row["id"]) + r'"'
    )
    found = [i + 1 for i, line in enumerate(lines) if marker.search(line)]
    if not found:
        raise SystemExit(f"{row['id']}: no marker in {row['file']}")
    row["line"] = found[0]
REGISTRY.write_text(json.dumps(rows, indent=2) + "\n")
print("synced")
