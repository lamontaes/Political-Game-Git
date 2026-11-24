"""Export what governments' pension plans cost each year and pay out each year.

A government's pension liability grows each year by the employer's normal
cost and shrinks by the benefits the plans pay. This file is each state's and
each listed county's and city's two shares of liability, and the national
medians for the governments the database does not list.

Source: the Public Plans Database (Center for Retirement Research at Boston
College, MissionSquare Research Institute, NASRA and GFOA), variables
NormCostAmount_ER (the employer's normal cost), expense_TotBenefits (total
benefit payments, reported as a deduction) and ActLiabilities_GASB (the
actuarial liability), one row per plan per fiscal year, in thousands of
dollars. The employer's normal cost is used, not the total: members pay their
own share into the plan, so the gap between liability and assets grows only
by the part the employer owes. Download it with:

  curl -sSL "https://publicplansdata.org/api/?q=QVariables&variables=fy,ppd_id,PlanName,StateAbbrev,AdministeringGovt,ActLiabilities_GASB,expense_TotBenefits,NormCostAmount_ER&filterfystart=2019&filterfyend=2024&format=csv&includeheader=1" -o ppd-flows.csv

Run: python3 scripts/research/export-pension-flows.py ppd-flows.csv

It writes data/research/money/pension-flows.json with:
1. `median`: the median normal-cost share and benefit share over every
   plan's latest year reporting each.
2. `byState`: each state's shares, from the plans its state government
   administers: the sum of the amounts over the sum of the liabilities, each
   plan's latest reported fiscal year. A share is written only when the plans
   reporting it hold at least half of the government's liability; a share
   read from a small plan alone (one police plan for a whole state) would not
   describe the government, so the game takes the median instead.
3. `byLocal`: the same for each county and city the database lists, named
   as `scripts/research/export-pension-funded-ratio.py` names them.
"""

import csv
import json
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data/research/money/pension-flows.json"
URL = "https://publicplansdata.org/api/?q=QVariables&variables=fy,ppd_id,PlanName,StateAbbrev,AdministeringGovt,ActLiabilities_GASB,expense_TotBenefits,NormCostAmount_ER&filterfystart=2019&filterfyend=2024&format=csv&includeheader=1"
MEASURES = {"normalCostShare": "NormCostAmount_ER", "benefitShare": "expense_TotBenefits"}
# The least share of a government's liability its reporting plans must hold.
COVERAGE = 0.5


def number(value: str):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def main() -> None:
    # Each measure keeps each plan's latest year that reports it.
    latest: dict = {measure: {} for measure in MEASURES}
    every: dict = {}
    for row in csv.DictReader(open(sys.argv[1], newline="")):
        liability = number(row["ActLiabilities_GASB"])
        if liability is None or liability <= 0:
            continue
        year = int(row["fy"])
        before = every.get(row["ppd_id"])
        if not before or before["year"] < year:
            every[row["ppd_id"]] = {
                "year": year,
                "liability": liability,
                "state": row["StateAbbrev"],
                "govt": row["AdministeringGovt"],
                "name": row["PlanName"].split("(")[0].strip(),
            }
        for measure, column in MEASURES.items():
            amount = number(row[column])
            if amount is None or amount == 0:
                continue
            before = latest[measure].get(row["ppd_id"])
            if before and before["year"] >= year:
                continue
            latest[measure][row["ppd_id"]] = {
                "year": year,
                "liability": liability,
                "amount": abs(amount),
                "state": row["StateAbbrev"],
                "govt": row["AdministeringGovt"],
                "name": row["PlanName"].split("(")[0].strip(),
            }

    def key(plan: dict):
        if plan["govt"] == "0":
            return ("state", plan["state"])
        if plan["govt"] in ("1", "2"):
            kind = "county" if plan["govt"] == "1" else "city"
            return ("local", plan["state"], kind, plan["name"])
        return None

    groups: dict = {}
    owed: dict = {}
    for plan in every.values():
        group = key(plan)
        if group:
            owed[group] = owed.get(group, 0) + plan["liability"]
    for measure, plans in latest.items():
        for plan in plans.values():
            group = key(plan)
            if group:
                groups.setdefault(group, {}).setdefault(measure, []).append(plan)

    def pooled(group: tuple, by_measure: dict) -> dict:
        out: dict = {}
        for measure in MEASURES:
            plans = by_measure.get(measure)
            if plans and sum(plan["liability"] for plan in plans) >= COVERAGE * owed[group]:
                out[measure] = round(
                    sum(plan["amount"] for plan in plans)
                    / sum(plan["liability"] for plan in plans),
                    4,
                )
        years = [plan["year"] for plans in by_measure.values() for plan in plans]
        out["fiscalYear"] = max(years)
        return out

    median = {
        measure: round(
            statistics.median(plan["amount"] / plan["liability"] for plan in plans.values()),
            4,
        )
        for measure, plans in latest.items()
    }
    out = {
        "id": "pension-flows",
        "source": "Public Plans Database, NormCostAmount_ER and expense_TotBenefits over ActLiabilities_GASB (each plan's latest reported fiscal year)",
        "url": URL,
        "readOn": "2026-09-29",
        "script": "scripts/research/export-pension-flows.py",
        "median": median,
        "planCount": {measure: len(plans) for measure, plans in latest.items()},
        "coverage": COVERAGE,
        "byState": {
            group[1]: pooled(group, by_measure)
            for group, by_measure in sorted(groups.items())
            if group[0] == "state"
        },
        "byLocal": [
            {"state": group[1], "kind": group[2], "name": group[3], **pooled(group, by_measure)}
            for group, by_measure in sorted(groups.items())
            if group[0] == "local"
        ],
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(
        f"median {median}, plans {out['planCount']}, {len(out['byState'])} states, "
        f"{len(out['byLocal'])} counties and cities; wrote {OUT.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
