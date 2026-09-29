"""Transcribe each state's rainy-day fund law from NASBO's Table 13.

NASBO, "Budget Processes in the States" (2021), Table 13, "Rainy Day Fund or
Budget Stabilization Fund", read from:

  https://higherlogicdownload.s3.amazonaws.com/NASBO/9d2d2db1-c943-4f1b-b750-0fca152d64c2/UploadedImages/Budget%20Processess/NASBO_2021_Budget_Processes_in_the_States_S.pdf

The table is prose in columns, so each state's row is transcribed by hand
below, with the words it rests on: the share of a year's spending its law
fills the general rainy-day fund to (the required minimum where one is set,
else the maximum size; two general funds are summed), and the share it moves
in each year, where the law sets one. It writes
data/research/money/state-reserve-rules.json, which the public budgets read
(src/simulation/public-budgets/reserve-rule.ts).

Run: python3 scripts/research/export-state-reserve-rules.py
"""

import json
import pathlib
import statistics

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/research/money/state-reserve-rules.json"
SRC = "https://higherlogicdownload.s3.amazonaws.com/NASBO/9d2d2db1-c943-4f1b-b750-0fca152d64c2/UploadedImages/Budget%20Processess/NASBO_2021_Budget_Processes_in_the_States_S.pdf"
# state: (target share or None, target basis, yearly deposit share or None, deposit basis)
R = {
 "AL": (0.10, "General Fund Rainy Day Fund: 10% of the previous year's General Fund appropriations (Amendment 803)", None, "repaid from the Alabama Trust Fund, not a set share"),
 "AK": (None, "Constitutional Budget Reserve: no size set", None, "settlements and year-end sweeps, not a set share"),
 "AZ": (0.10, "Budget Stabilization Fund: 10% of current-year General Fund revenue", None, "revenue growth above the seven-year average, not a set share"),
 "AR": (None, "Long Term Reserve Fund: no size set", None, "a transfer from the allotment reserve, not a set share"),
 "CA": (0.10, "Budget Stabilization Account: 10% of General Fund tax revenues (Const. art. XVI, sec. 20)", 0.015, "1.5% of annual General Fund revenues, plus a share of capital gains"),
 "CO": (0.0725, "General Fund reserve: 7.25% of General Fund appropriations", None, "set by the General Assembly each year"),
 "CT": (0.15, "Budget Reserve Fund: 15% of General Fund appropriations", None, "year-end surplus and volatile taxes, not a set share"),
 "DE": (0.05, "Budget Reserve Account: 5% of estimated General Fund revenue", None, "year-end surplus, not a set share"),
 "FL": (0.05, "Budget Stabilization Fund: at least 5% of the last year's General Revenue collections", None, "appropriated by the Legislature"),
 "GA": (0.15, "Revenue Shortfall Reserve: 15% of prior-year net treasury receipts", None, "year-end surplus lapses to it, not a set share"),
 "HI": (None, "Emergency and Budget Reserve Fund: no size set", None, "tobacco settlement and appropriations, not a set share"),
 "ID": (0.10, "Budget Stabilization Fund: 10% of the previous year's General Fund receipts", 0.01, "up to 1% of the previous year's collections when receipts grow more than 4%"),
 "IL": (None, "Budget Stabilization Fund: no size set", None, "appropriated or transferred by law"),
 "IN": (None, "Rainy Day Fund: set by personal income growth, no size in the table", None, "set by the growth of adjusted personal income"),
 "IA": (0.10, "Cash Reserve Fund 7.5% plus Economic Emergency Fund 2.5% of adjusted revenues", None, "the previous year's surplus, not a set share"),
 "KS": (None, "Budget Stabilization Fund: no size set", None, "a share of revenue above the consensus estimate"),
 "KY": (None, "Budget Reserve Trust Fund: no size set", None, "surplus and appropriations, not a set share"),
 "LA": (0.04, "Budget Stabilization Fund: 4% of total state revenue receipts for the previous year", None, "mineral and nonrecurring revenue, not a set share"),
 "ME": (0.12, "Budget Stabilization Fund: 12% of the previous year's General Fund revenues", None, "48% of the unappropriated surplus, not a set share"),
 "MD": (0.05, "Revenue Stabilization Account: 5% of estimated General Fund revenues", None, "mandated appropriations set by the fund's balance"),
 "MA": (0.15, "Commonwealth Stabilization Fund: 15% of annual revenue", None, "year-end surplus and excess capital gains, not a set share"),
 "MI": (0.15, "Countercyclical Budget and Economic Stabilization Fund: 15% of General Fund and School Aid Fund revenue", None, "triggered by personal income growth"),
 "MN": (None, "Budget Reserve Account: a dollar amount set by revenue volatility ($2.4 billion in fiscal 2020-21), not a share", None, "one third of a November forecast balance"),
 "MS": (0.10, "Working Cash Stabilization Reserve Fund: 10% of General Fund appropriation", None, "ending cash transfers, not a set share"),
 "MO": (0.075, "Budget Reserve Fund: at least 7.5% of the previous year's net general revenue collections (Constitution)", None, "kept at its required minimum"),
 "MT": (0.045, "Budget Stabilization Reserve: 4.5% of appropriations in the second year of the biennium", None, "revenue above the official estimate"),
 "NE": (None, "Cash Reserve Fund: no size set", None, "receipts above the certified forecast"),
 "NV": (0.20, "Account to Stabilize the Operation of State Government: 20% of General Fund operating appropriations", None, "40% of the ending balance above 7% of the General Fund"),
 "NH": (0.10, "Revenue Stabilization Reserve Account: 10% of the last completed year's unrestricted General Fund revenue", None, "year-end surplus, not a set share"),
 "NJ": (None, "Surplus Revenue Fund: no size set", None, "half of revenue above estimates"),
 "NM": (None, "Tax Stabilization Reserve: no size in the table", None, "appropriations and investment income"),
 "NY": (0.07, "Tax Stabilization Reserve 2% of the General Fund norm plus Rainy Day Reserve 5% of General Fund disbursements", 0.002, "at most 0.2% of the General Fund norm a year to the Tax Stabilization Reserve"),
 "NC": (None, "Savings Reserve: two years of need in 9 of 10 downturn scenarios, not a share", None, "15% of General Fund revenue growth"),
 "ND": (0.15, "Budget Stabilization Fund: 15% of appropriated General Fund expenditures", None, "filled to its maximum from the General Fund after the budget is set"),
 "OH": (0.085, "Budget Stabilization Fund: 8.5% of the preceding year's General Revenue Fund revenues", None, "transfers from the General Revenue Fund"),
 "OK": (0.15, "Constitutional Reserve Fund: 15% of prior-year General Revenue collections", None, "collections above 100% of the estimate"),
 "OR": (0.125, "Rainy Day Fund 7.5% plus Education Stability Fund 5% of the previous biennium's General Fund revenue", 0.005, "1% of the previous biennium's General Fund appropriations, half a percent a year"),
 "PA": (0.06, "Budget Stabilization Reserve Fund: the surplus transfer falls from 25% to 10% once the fund reaches 6% of General Fund revenues", None, "25% of the year-end surplus"),
 "RI": (0.05, "Budget Reserve and Cash Stabilization Fund: 5% of general revenue resources (Constitution)", 0.03, "3% of general revenues each year"),
 "SC": (0.07, "General Reserve 5% plus Capital Reserve 2% of the last completed year's General Fund revenues", None, "one-time transfers at the start of the year"),
 "SD": (0.10, "Budget Reserve Fund: 10% of the prior year's General Appropriations Act", None, "unspent general funds at year end"),
 "TN": (0.08, "Reserve for Revenue Fluctuations: 8% of General and Education Trust Fund allocations", None, "10% of tax revenue growth"),
 "TX": (0.20, "Economic Stabilization Fund: 10% of general revenue deposited over the preceding two-year biennium, 20% of one year's", None, "half of the unencumbered general revenue balance"),
 "UT": (0.08, "General Fund Budget Reserve Account: 8% of General Fund appropriations", None, "25% of the year-end surplus"),
 "VT": (0.05, "Budget Stabilization Reserves: 5% of the prior year's appropriations", None, "undesignated surpluses"),
 "VA": (0.15, "Revenue Stabilization Fund: 15% of average annual income, corporate and sales tax revenue over the prior three years (Const. art. X, sec. 8)", None, "half the growth above the six-year average"),
 "WA": (None, "Budget Stabilization Account: no size in the table", 0.01, "1% of general state revenues each year (RCW 43.79.490)"),
 "WV": (0.13, "Revenue Shortfall Reserve Fund: 13% of General Revenue appropriations", None, "the first half of the year-end surplus"),
 "WI": (None, "Budget Stabilization Fund: no size set", None, "half of unanticipated revenues"),
 "WY": (None, "Legislative Stabilization Reserve Account: no size set", None, "legislative appropriation"),
 "DC": (0.0234, "Fiscal Stabilization Reserve Fund: 2.34% of adjusted expenditures", None, "uncommitted funds at year end"),
}
targets = [v[0] for v in R.values() if v[0] is not None]
deposits = [v[2] for v in R.values() if v[2] is not None]
out = {
  "id": "state-reserve-rules-2021",
  "source": SRC,
  "table": "NASBO, Budget Processes in the States (2021), Table 13: Rainy Day Fund or Budget Stabilization Fund",
  "readOn": "2026-09-29",
  "rule": "target: the share of a year's spending the state's rainy-day law fills its fund to (the required minimum where one is set, else the maximum size), summed where the law sets two general funds; deposit: the share of spending the law moves into the fund each year, where it sets one. A state whose law sets none is null and takes the median of the states that do.",
  "median": {"target": statistics.median(targets), "targetStates": len(targets), "deposit": statistics.median(deposits), "depositStates": len(deposits)},
  "states": {k: {"target": v[0], "targetBasis": v[1], "deposit": v[2], "depositBasis": v[3]} for k, v in sorted(R.items())},
}
OUT.write_text(json.dumps(out, indent=2) + "\n")
print(out["median"], len(R))
