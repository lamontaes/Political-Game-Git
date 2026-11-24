"""Export how large public pension liabilities are against public spending.

A government's opening pension liability was 1.2 times a year of its
spending for every government (PLACEHOLDER). This file replaces that with a
measured ratio: in each state, the actuarial liability of every public plan
the Public Plans Database lists there (state- and locally administered
alike), over that state's combined state and local direct general
expenditure. Many state-administered plans also cover local employees
(teachers, cost-sharing plans), so a state's plans cannot be set against
the state government's spending alone; the combined ratio is the same for
every government in the state, and each government reads it as an estimate.

Sources:
- Public Plans Database (Center for Retirement Research at Boston College,
  MissionSquare Research Institute, NASRA and GFOA), ActLiabilities_GASB,
  each plan's latest reported fiscal year, thousands of dollars. Download:

  curl -sSL "https://publicplansdata.org/api/?q=QVariables&variables=fy,ppd_id,PlanName,StateAbbrev,AdministeringGovt,ActLiabilities_GASB,ActAssets_GASB&filterfystart=2019&filterfyend=2024&format=csv&includeheader=1" -o ppd-funding.csv

- U.S. Census Bureau, State and Local Government Finances 2022, direct
  general expenditure (data/research/money/state-local-finances-2022.json).

Run: python3 scripts/research/export-pension-liability-ratio.py ppd-funding.csv

It writes data/research/money/pension-liability-ratio.json with each state's
ratio, the median of the states' ratios (for a place with no listed plan or
no Census row), and the pooled national ratio.
"""

import csv
import json
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data/research/money/pension-liability-ratio.json"
FINANCES = ROOT / "data/research/money/state-local-finances-2022.json"
URL = "https://publicplansdata.org/api/?q=QVariables&variables=fy,ppd_id,PlanName,StateAbbrev,AdministeringGovt,ActLiabilities_GASB,ActAssets_GASB&filterfystart=2019&filterfyend=2024&format=csv&includeheader=1"


def main() -> None:
    latest: dict = {}
    for row in csv.DictReader(open(sys.argv[1], newline="")):
        try:
            liability = float(row["ActLiabilities_GASB"])
        except (TypeError, ValueError):
            continue
        if liability <= 0:
            continue
        year = int(row["fy"])
        before = latest.get(row["ppd_id"])
        if before and before["year"] >= year:
            continue
        latest[row["ppd_id"]] = {
            "year": year,
            "liabilityDollars": liability * 1000,
            "state": row["StateAbbrev"],
        }
    finances = json.load(open(FINANCES))["places"]
    by_state: dict = {}
    for plan in latest.values():
        by_state.setdefault(plan["state"], []).append(plan)
    rows = {}
    for state, plans in sorted(by_state.items()):
        place = finances.get(f"US-{state}")
        if not place:
            continue
        spending = place["dollars"]["stateAndLocal"]["directGeneralExpenditure"]
        liability = sum(plan["liabilityDollars"] for plan in plans)
        rows[state] = {
            "liabilityToSpending": round(liability / spending, 4),
            "plans": len(plans),
            "fiscalYear": max(plan["year"] for plan in plans),
        }
    us = finances["US"]["dollars"]["stateAndLocal"]["directGeneralExpenditure"]
    pooled = sum(
        plan["liabilityDollars"]
        for plan in latest.values()
        if f"US-{plan['state']}" in finances
    )
    out = {
        "id": "pension-liability-ratio",
        "source": "Public Plans Database ActLiabilities_GASB (each plan's latest reported fiscal year), over Census State and Local Government Finances 2022 combined direct general expenditure",
        "url": URL,
        "readOn": "2026-10-01",
        "script": "scripts/research/export-pension-liability-ratio.py",
        "median": round(statistics.median(r["liabilityToSpending"] for r in rows.values()), 4),
        "national": round(pooled / us, 4),
        "planCount": len(latest),
        "byState": rows,
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(
        f"{len(latest)} plans, {len(rows)} states, median {out['median']}, "
        f"national {out['national']}; wrote {OUT.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
