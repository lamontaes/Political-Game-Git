"""Each budget line's left-right direction, from who wants more spent on it.

Reads data/research/money/spending-preferences-by-party.json (GSS 2022/2024
and Pew 2019, by party with leaners) and writes
src/core2/data/legislature/budget-line-axes.json: for each line, the
Republican net share wanting more (increase minus decrease) minus the
Democratic one, in [-1, 1]. Positive: the right wants more spent on it.

Run: python3 scripts/research/build-budget-line-axes.py
"""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data/research/money/spending-preferences-by-party.json"
OUT = ROOT / "src/core2/data/legislature/budget-line-axes.json"

lines = json.loads(SOURCE.read_text())["lines"]
axes = {}
for line, row in sorted(lines.items()):
    def net(party: str) -> float:
        return row[f"{party}Increase"] - (row.get(f"{party}Decrease") or 0)

    axes[line] = {
        "axis": round(max(-1.0, min(1.0, net("republicans") - net("democrats"))), 3),
        "estimate": bool(row.get("estimate")),
        "source": row["source"],
    }
OUT.write_text(
    json.dumps(
        {
            "about": "Each budget line's left-right direction: the Republican net share wanting more spent on it minus the Democratic one (increase minus decrease, leaners included). Positive means the right wants more. Built by scripts/research/build-budget-line-axes.py from data/research/money/spending-preferences-by-party.json.",
            "lines": axes,
        },
        indent=2,
    )
    + "\n"
)
print(len(axes), "lines")
