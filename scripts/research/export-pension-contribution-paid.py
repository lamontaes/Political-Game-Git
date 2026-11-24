"""Export the share of their required pension contribution governments pay.

Claude CTO's rulings of September 29, 2026 (12:54 a.m. EDT): a government's
pension share starts from its own real reported payment, and then becomes a
budget decision. This file is each state's and each listed county's and
city's reported share, and the national median for the governments the
database does not list.

Source: the Public Plans Database (Center for Retirement Research at Boston
College, MissionSquare Research Institute, NASRA and GFOA), variable
PercentReqContPaid: the employer contributions a plan received as a share of
its actuarially required contribution, one row per plan per fiscal year.
Download it with:

  curl -sSL "https://publicplansdata.org/api/?q=QVariables&variables=fy,ppd_id,PlanName,StateAbbrev,AdministeringGovt,PercentReqContPaid,ActLiabilities_GASB&filterfystart=2019&filterfyend=2024&format=csv&includeheader=1" -o ppd.csv

Run: python3 scripts/research/export-pension-contribution-paid.py ppd.csv

It writes data/research/money/pension-contribution-paid.json with:
1. `share`: the quantiles of the share paid, every plan and fiscal year 2022
   through 2024 pooled, the lowest and highest 1% trimmed, and its median.
2. `byState`: each state's share, from the plans its state government
   administers: each plan's latest reported fiscal year, weighted by the
   plan's actuarial liability.
3. `byLocal`: the same for each county and city the database lists, by the
   name before the parenthesis in the plan's name ("Cook County (IL) ERS" is
   Cook County, Illinois). School district plans are left out: the game
   holds no school district budgets.
"""

import csv
import json
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data/research/money/pension-contribution-paid.json"
URL = "https://publicplansdata.org/api/?q=QVariables&variables=fy,ppd_id,PlanName,StateAbbrev,AdministeringGovt,PercentReqContPaid,ActLiabilities_GASB&filterfystart=2019&filterfyend=2024&format=csv&includeheader=1"
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
    # Each plan's latest reported share, with its liability as the weight.
    latest: dict = {}
    for row in rows:
        try:
            share = float(row["PercentReqContPaid"])
        except (TypeError, ValueError):
            continue
        year = int(row["fy"])
        try:
            weight = float(row["ActLiabilities_GASB"])
        except (TypeError, ValueError, KeyError):
            weight = None
        before = latest.get(row["ppd_id"])
        if before and before["year"] > year:
            continue
        if before and before["year"] == year and weight is None:
            continue
        latest[row["ppd_id"]] = {
            "year": year,
            "share": share,
            "weight": weight,
            "state": row["StateAbbrev"],
            "govt": row["AdministeringGovt"],
            "name": row["PlanName"].split("(")[0].strip(),
        }

    def weighted(plans: list) -> dict:
        weights = [plan["weight"] or 0 for plan in plans]
        total = sum(weights)
        share = (
            sum(plan["share"] * w for plan, w in zip(plans, weights)) / total
            if total > 0
            else statistics.mean(plan["share"] for plan in plans)
        )
        return {
            "share": round(share, 4),
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
    out = {
        "id": "pension-contribution-paid",
        "source": "Public Plans Database, PercentReqContPaid (employer contributions received over the actuarially required contribution)",
        "url": URL,
        "readOn": "2026-09-29",
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
        "byState": {state: weighted(plans) for state, plans in sorted(by_state.items())},
        "byLocal": [
            {"state": state, "kind": kind, "name": name, **weighted(plans)}
            for (state, kind, name), plans in sorted(by_local.items())
        ],
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(
        f"{len(recent)} plan-years, median {out['share']['median']}, "
        f"{len(by_state)} states, {len(by_local)} counties and cities; "
        f"wrote {OUT.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
