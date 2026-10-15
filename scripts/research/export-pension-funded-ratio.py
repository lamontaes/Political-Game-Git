"""Export the share of their pension liability governments' plans have funded.

A government's pension opens with the funded ratio its own plans reported,
not one hand-set share for every government. This file is each state's and
each listed county's and city's funded ratio, and the national median for
the governments the database does not list.

Source: the Public Plans Database (Center for Retirement Research at Boston
College, MissionSquare Research Institute, NASRA and GFOA), variables
ActLiabilities_GASB and ActAssets_GASB: each plan's actuarial liability and
the assets held against it under GASB reporting, one row per plan per fiscal
year, in thousands of dollars. Download it with:

  curl -sSL "https://publicplansdata.org/api/?q=QVariables&variables=fy,ppd_id,PlanName,StateAbbrev,AdministeringGovt,ActLiabilities_GASB,ActAssets_GASB&filterfystart=2019&filterfyend=2024&format=csv&includeheader=1" -o ppd-funding.csv

Run: python3 scripts/research/export-pension-funded-ratio.py ppd-funding.csv

It writes data/research/money/pension-funded-ratio.json with:
1. `median`: the median funded ratio of every plan's latest reported year.
2. `byState`: each state's ratio, from the plans its state government
   administers: the sum of their assets over the sum of their liabilities,
   each plan's latest reported fiscal year.
3. `byLocal`: the same for each county and city the database lists, named
   as `scripts/research/export-pension-contribution-paid.py` names them.
"""

import csv
import json
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data/research/money/pension-funded-ratio.json"
URL = "https://publicplansdata.org/api/?q=QVariables&variables=fy,ppd_id,PlanName,StateAbbrev,AdministeringGovt,ActLiabilities_GASB,ActAssets_GASB&filterfystart=2019&filterfyend=2024&format=csv&includeheader=1"


def main() -> None:
    latest: dict = {}
    for row in csv.DictReader(open(sys.argv[1], newline="")):
        try:
            liability = float(row["ActLiabilities_GASB"])
            assets = float(row["ActAssets_GASB"])
        except (TypeError, ValueError):
            continue
        if liability <= 0 or assets < 0:
            continue
        year = int(row["fy"])
        before = latest.get(row["ppd_id"])
        if before and before["year"] >= year:
            continue
        latest[row["ppd_id"]] = {
            "year": year,
            "liability": liability,
            "assets": assets,
            "state": row["StateAbbrev"],
            "govt": row["AdministeringGovt"],
            "name": row["PlanName"].split("(")[0].strip(),
        }

    def pooled(plans: list) -> dict:
        return {
            "fundedRatio": round(
                sum(plan["assets"] for plan in plans)
                / sum(plan["liability"] for plan in plans),
                4,
            ),
            "plans": len(plans),
            "fiscalYear": max(plan["year"] for plan in plans),
        }

    by_state: dict = {}
    by_local: dict = {}
    for plan in latest.values():
        if plan["govt"] == "0":
            by_state.setdefault(plan["state"], []).append(plan)
        elif plan["govt"] in ("1", "2"):
            kind = "county" if plan["govt"] == "1" else "city"
            by_local.setdefault((plan["state"], kind, plan["name"]), []).append(plan)
    ratios = [plan["assets"] / plan["liability"] for plan in latest.values()]
    out = {
        "id": "pension-funded-ratio",
        "source": "Public Plans Database, ActAssets_GASB over ActLiabilities_GASB (each plan's latest reported fiscal year)",
        "url": URL,
        "readOn": "2026-09-29",
        "script": "scripts/research/export-pension-funded-ratio.py",
        "median": round(statistics.median(ratios), 4),
        "planCount": len(ratios),
        "byState": {state: pooled(plans) for state, plans in sorted(by_state.items())},
        "byLocal": [
            {"state": state, "kind": kind, "name": name, **pooled(plans)}
            for (state, kind, name), plans in sorted(by_local.items())
        ],
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(
        f"{len(ratios)} plans, median {out['median']}, {len(by_state)} states, "
        f"{len(by_local)} counties and cities; wrote {OUT.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
