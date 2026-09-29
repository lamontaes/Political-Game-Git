"""Export the share of their required pension contribution governments pay.

Claude CTO's ruling of September 28, 2026 (10:32 p.m. EDT, from Lamontae's
notes): the share a government pays of its required pension contribution
starts from the national average with a realistic spread per government, and
drifts over time. This file is that average and spread, measured.

Source: the Public Plans Database (Center for Retirement Research at Boston
College, MissionSquare Research Institute, NASRA and GFOA), variable
PercentReqContPaid: the employer contributions a plan received as a share of
its actuarially required contribution, one row per plan per fiscal year.
Download it with:

  curl -sSL "https://publicplansdata.org/api/?q=QVariables&variables=fy,ppd_id,PlanName,StateAbbrev,AdministeringGovt,PercentReqContPaid&filterfystart=2019&filterfyend=2024&format=csv&includeheader=1" -o ppd.csv

Run: python3 scripts/research/export-pension-contribution-paid.py ppd.csv

It writes data/research/money/pension-contribution-paid.json with:
1. `share`: the quantiles of the share paid, every plan and fiscal year 2022
   through 2024 pooled, the lowest and highest 1% trimmed.
2. `yearlyChange`: the quantiles of one plan's change in that share from one
   fiscal year to the next, 2019 through 2024, trimmed the same way.
"""

import csv
import json
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data/research/money/pension-contribution-paid.json"
URL = "https://publicplansdata.org/api/?q=QVariables&variables=fy,ppd_id,PlanName,StateAbbrev,AdministeringGovt,PercentReqContPaid&filterfystart=2019&filterfyend=2024&format=csv&includeheader=1"
STEPS = [step / 20 for step in range(21)]


def quantile(values: list, p: float) -> float:
    ordered = sorted(values)
    at = p * (len(ordered) - 1)
    low = int(at)
    high = min(low + 1, len(ordered) - 1)
    return ordered[low] + (ordered[high] - ordered[low]) * (at - low)


def trimmed(values: list) -> list:
    low, high = quantile(values, 0.01), quantile(values, 0.99)
    return [value for value in values if low <= value <= high]


def table(values: list) -> list:
    kept = trimmed(values)
    return [round(quantile(kept, p), 4) for p in STEPS]


def main() -> None:
    rows = list(csv.DictReader(open(sys.argv[1], newline="")))
    by_plan: dict = {}
    for row in rows:
        try:
            share = float(row["PercentReqContPaid"])
        except (TypeError, ValueError):
            continue
        by_plan.setdefault(row["ppd_id"], {})[int(row["fy"])] = share
    recent = [
        share
        for years in by_plan.values()
        for year, share in years.items()
        if 2022 <= year <= 2024
    ]
    changes = [
        years[year] - years[year - 1]
        for years in by_plan.values()
        for year in years
        if year - 1 in years
    ]
    out = {
        "id": "pension-contribution-paid",
        "source": "Public Plans Database, PercentReqContPaid (employer contributions received over the actuarially required contribution)",
        "url": URL,
        "readOn": "2026-09-28",
        "script": "scripts/research/export-pension-contribution-paid.py",
        "quantiles": STEPS,
        "share": {
            "fiscalYears": [2022, 2024],
            "planYears": len(recent),
            "median": round(statistics.median(recent), 4),
            "mean": round(statistics.mean(trimmed(recent)), 4),
            "belowFull": round(sum(1 for v in recent if v < 0.995) / len(recent), 4),
            "values": table(recent),
        },
        "yearlyChange": {
            "fiscalYears": [2019, 2024],
            "planYears": len(changes),
            "values": table(changes),
        },
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(
        f"{len(recent)} plan-years, median {out['share']['median']}, "
        f"{len(changes)} yearly changes; wrote {OUT.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
