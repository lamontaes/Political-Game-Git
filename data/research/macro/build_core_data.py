"""Write src/core2/data/macro/{history,parameters}.json from the prepared agency series.

Usage: python3 -B data/research/macro/build_core_data.py <cpi-annual.txt>
The annual CPI file is BLS CUUR0000SA0 annual averages (period M13) from
https://download.bls.gov/pub/time.series/cu/cu.data.1.AllItems.
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent.parent.parent / "src" / "core2" / "data" / "macro"
monthly = json.loads((HERE / "series" / "monthly.json").read_text())
bands = json.loads((HERE / "series" / "bands.json").read_text())
output_band = json.loads((HERE / "series" / "output-band.json").read_text())
passthrough = json.loads((HERE / "series" / "passthrough-1990-2018.json").read_text())
quarterly = json.loads((HERE / "series" / "quarterly.json").read_text())
annual = {int(y): float(v) for y, v in (line.split() for line in pathlib.Path(sys.argv[1]).read_text().splitlines())}

ix = {r["month"]: r for r in monthly}
def shift(m, n):
    y, mo = map(int, m.split("-")); t = y * 12 + mo - 1 + n
    return f"{t // 12}-{t % 12 + 1:02d}"
def infl(m):
    a, b = ix.get(m, {}).get("priceIndex"), ix.get(shift(m, -12), {}).get("priceIndex")
    return None if a is None or b is None else (a / b - 1) * 100
window = [m for m in sorted(ix) if "1990-01" <= m <= "2019-12"]
u_mean = sum(ix[m]["unemploymentPct"] for m in window) / len(window)
pis = [infl(m) for m in window if infl(m) is not None]
pi_mean = sum(pis) / len(pis)
prime_note = "H.15 bank prime loan rate (RIFSPBLP_N.M) less the effective federal funds rate (RIFSPFF_N.M), monthly 1995-2026: mean 3.08, range 2.85 to 3.61."

BLS = "BLS LNS14000000, CUSR0000SA0, CES0000000001, CES0500000003; Fed H.15; BEA NIPA A191RX; data/research/macro/series/receipts.json"
def sourced(value, citation, low=None, high=None, unit=None):
    row = {"value": value, "tag": "SOURCED", "citation": citation}
    if low is not None:
        row["spread"] = {"low": low, "high": high, "unit": unit, "citation": citation}
    return row
def tunable(value, low, high, unit, citation):
    return {"value": value, "tag": "TUNABLE", "citation": citation,
            "spread": {"low": low, "high": high, "unit": unit, "citation": citation}}

P = {
    "macroMonthsPerYear": sourced(12, "Calendar months per year."),
    "macroHundred": sourced(100, "Percent scale."),
    "macroHalf": sourced(0.5, "One half, for medians and midpoints."),
    "macroQuartersPerYear": sourced(4, "Calendar quarters per year."),
    "macroMonthsPerQuarter": sourced(3, "Calendar months per quarter."),
    "macroHistoryFirstYear": sourced(2021, "M1-history (owner, Oct 10): the years from the latest full-data year, 2021, to the start date are the coarse run."),
    "macroHistoryMonths": sourced(13, "The opening month plus the twelve before it, so every first-year 12-month change has its real base."),
    # Measured from the agency series.
    "macroNaturalUnemploymentPct": tunable(4.5, 4.0, round(u_mean, 2), "percent", f"CBO's noncyclical rate of unemployment, about 4.4 to 4.6 percent in its 2016-2026 Budget and Economic Outlook editions; the 1990-2019 mean unemployment rate, {u_mean:.2f} percent ({BLS}), bounds it from above."),
    "macroInflationAnchorPct": sourced(round(pi_mean, 3), f"Mean 12-month CPI-U inflation 1990-2019 ({BLS}).", 2.0, 2.9, "percent"),
    "macroInflationPersistence": sourced(0.9444, f"OLS of 12-month CPI inflation on its previous month and unemployment, 1990-2019, SE 0.016 ({BLS}).", 0.912, 0.977, "monthly coefficient"),
    "macroTrendGrowthPct": sourced(2.482, f"Okun regression of annualized real GDP growth on the quarterly unemployment change, 1990-2019 intercept, SE 0.18 ({BLS}).", 2.12, 2.84, "annual percent"),
    "macroOkunOutputPerUnemploymentPoint": sourced(1.152, f"Same Okun regression: 4.61 annualized points per quarterly point, so 1.15 percent of output per point of unemployment, SE 0.16 ({BLS}).", 0.83, 1.47, "percent of output per point"),
    "macroJobsTrendMonthlyPct": sourced(0.0901, f"OLS of monthly payroll growth on the unemployment change, 1990-2019 intercept, SE 0.007 ({BLS}).", 0.075, 0.105, "percent per month"),
    "macroJobsPerUnemploymentPoint": sourced(0.468, f"Same payroll regression: percent of jobs lost per point of unemployment, SE 0.048 ({BLS}).", 0.37, 0.56, "percent per point"),
    "macroWageGrowthIntercept": sourced(3.554, f"OLS of 12-month average hourly earnings growth on lagged inflation and unemployment, 2007-2019, SE 0.13 ({BLS}).", 3.29, 3.82, "annual percent"),
    "macroWageGrowthPerInflation": sourced(0.0175, "Same wage regression, inflation coefficient, SE 0.027.", -0.037, 0.072, "points per point"),
    "macroWageGrowthPerUnemployment": sourced(-0.169, "Same wage regression, unemployment coefficient, SE 0.017.", -0.204, -0.135, "points per point"),
    "macroTreasuryIntercept": sourced(0.0345, f"OLS of the 10-year Treasury yield on its previous month and the effective funds rate, 1990-2019, SE 0.034 (H.15 RIFLGFCY10_N.M).", -0.033, 0.102, "percent"),
    "macroTreasuryPersistence": sourced(0.9832, "Same Treasury regression, own-lag coefficient, SE 0.011.", 0.960, 1.0, "monthly coefficient"),
    "macroTreasuryPerPolicy": sourced(0.0086, "Same Treasury regression, policy-rate coefficient, SE 0.009.", -0.010, 0.027, "points per point"),
    "macroMortgageIntercept": sourced(0.1092, "OLS of the FHFA MIRS 30-year fixed contract rate on its previous month and the effective funds rate, 1990-2019, SE 0.042. This product uses FHFA data but is neither endorsed nor certified by FHFA.", 0.025, 0.193, "percent"),
    "macroMortgagePersistence": sourced(0.9728, "Same mortgage regression, own-lag coefficient, SE 0.009.", 0.955, 0.991, "monthly coefficient"),
    "macroMortgagePerPolicy": sourced(0.0166, f"Same mortgage regression, policy-rate coefficient, SE 0.007. The unconditional 12-month pass-through is {passthrough['coefficient']:.2f} (HAC SE {passthrough['standardErrorHAC12']:.2f}).", 0.003, 0.030, "points per point"),
    "macroMortgageSpreadOverTreasuryPct": {"value": 2.22, "tag": "ESTIMATED", "citation": "Freddie Mac PMMS 30-year fixed less the 10-year Treasury, monthly May 2019 to September 2026: mean 2.22 points (min 1.34, max 2.96; 2025 mean 2.31). The CTO's stand-in research (data/research/stand-in-figures-2026-10-12.json).", "estimatedFrom": "Only months past the published series use the spread.", "stopgapId": "SG-WORLD-macro-mortgage-spread", "spread": {"low": 1.34, "high": 2.96, "unit": "percentage points", "citation": "Freddie Mac PMMS and H.15 GS10, 2019-2026."}},
    "macroPrimeSpreadPct": sourced(3.08, prime_note, 2.85, 3.61, "percentage points"),
    "macroInflationGoalPct": sourced(2.0, "FOMC Statement on Longer-Run Goals and Monetary Policy Strategy (2% PCE inflation), https://www.federalreserve.gov/monetarypolicy/files/fomc_longerrungoals.pdf"),
    "macroCpiOverPceWedgePct": tunable(0.4, 0.3, 0.6, "percentage points", "CPI-U has run above PCE inflation; BEA NIPA table 2.8.7 and BLS CPI-U, 1990-2019 averages differ by about 0.3 to 0.6 points."),
    "macroPolicyLowerBoundPct": sourced(0.125, "The lowest target range the FOMC has set is 0 to 0.25 percent (December 2008, March 2020); its midpoint."),
    "macroPolicyStepPct": sourced(0.25, "FOMC target ranges move in multiples of 25 basis points."),
    # Judgment values with their checked spreads.
    "macroOutputGapPersistence": tunable(0.97, 0.94, 0.985, "monthly coefficient", "Output gaps close with a half-life of about two years (CBO potential output; Okun gaps 1990-2019); checked against the 1990-2026 bands in this module's test."),
    "macroRealRateEffectOnGap": tunable(0.03, 0.01, 0.06, "gap points per month per real-rate point", "A one-point higher real policy rate lowers output by roughly 0.3 to 1 percent after a year or two (Romer and Romer 2004, AER; FRB/US simulations)."),
    "macroNeutralRealRatePct": tunable(0.5, -0.5, 1.5, "percent", "Laubach-Williams and Holston-Laubach-Williams estimates of the neutral real rate, 2016-2024, Federal Reserve Bank of New York."),
    "macroPhillipsSlope": tunable(0.01, 0.0, 0.03, "12-month inflation points per month per gap point", "The 1990-2019 Phillips slope is flat (OLS on unemployment, -0.008, SE 0.013); kept small and positive."),
    "macroTownWeightPerPerson": sourced(3.0e-9, "One resident's share of the national population, Census 2020 count 331.4 million."),
    "macroPublicBudgetImpulse": {"value": 0, "tag": "ESTIMATED", "citation": "Until M1-07 budgets land, public money adds no impulse beyond its real average, which the trend already carries.", "estimatedFrom": "Trend growth 1990-2019 includes average public spending.", "stopgapId": "SG-WORLD-macro-public-budget", "spread": {"low": -0.5, "high": 0.5, "unit": "gap points per year", "citation": "Bounds outside recessions; when budgets land, the impulse is the change in real public purchases as a share of output times a multiplier of about 1.2 at one year and 1.5 at two (Monacelli, Perotti and Trigari 2010), below 1 for own-financed state and local spending (Clemens and Miran 2012). CTO stand-in research, data/research/stand-in-figures-2026-10-12.json."}},
    # The board.
    "macroTaylorInflationResponse": sourced(0.5, "Taylor (1993), Discretion versus policy rules in practice, Carnegie-Rochester 39."),
    "macroTaylorGapResponse": sourced(0.5, "Taylor (1993): 0.5 on the output gap; the balanced-approach rule uses 1.0 (Federal Reserve Monetary Policy Report, policy rules box)."),
    "macroLeanGapShift": tunable(0.5, 0.25, 1.0, "share of the gap response", "Hawks weight jobs less and doves more, spanning Taylor (1993) and the balanced-approach rule."),
    "macroLeanInflationShift": tunable(0.5, 0.25, 1.0, "share of the inflation response", "Hawks weight inflation more; Malmendier, Nagel and Yan (2021), The making of hawks and doves, JME 117."),
    "macroExperienceWeightShape": tunable(3.0, 1.0, 4.0, "weighting exponent", "Learning-from-experience weights on lifetime inflation, Malmendier and Nagel (2016), QJE 131; Malmendier, Nagel and Yan (2021)."),
    "macroExperienceLeanScale": tunable(1.0, 0.5, 2.0, "standard deviations of the board's experienced inflation", "A member's lean is their lived inflation's distance from the board's mean, in the board's own standard deviations (Malmendier, Nagel and Yan 2021 find votes move with that relative experience)."),
    "macroSmoothingBase": tunable(0.3, 0.15, 0.5, "share of the gap closed per meeting", "Estimated inertial policy rules close about 15 to 30 percent of the gap per quarter (Clarida, Gali and Gertler 2000, QJE)."),
    "macroRatePullWeight": tunable(4.0, 1.0, 8.0, "score per pull", "Policy pulls outweigh one trait's pull on commit or delay in the shared chooser."),
    "macroGovernorTermYears": sourced(14, "12 U.S.C. 241: Board governors serve fourteen-year terms."),
    "macroPresidentTermYears": sourced(5, "12 U.S.C. 341: Reserve Bank presidents serve five-year terms."),
    "macroGovernorMinimumAge": tunable(45, 40, 55, "years", "Ages of governors at appointment, Federal Reserve Board history of members."),
    "macroGovernorAgeSpan": tunable(20, 10, 25, "years", "Ages of governors at appointment span about 40 to 70."),
    "macroBoardVoters": sourced(12, "12 U.S.C. 263: seven governors, the New York president and four rotating presidents vote."),
    "macroTraitScaleBoard": sourced(3, "The recorded trait scale (traitScale)."),
}

# After FHFA's MIRS ended (2019), Freddie Mac's PMMS 30-year fixed, monthly average of weekly rates.
pmms = json.loads((HERE / "series" / "pmms-monthly.json").read_text())
for r in monthly:
    if "mortgage30Pct" not in r and r["month"] in pmms:
        r["mortgage30Pct"] = pmms[r["month"]]
history = []
for r in monthly:
    history.append({k: r[k] for k in ["month", "unemploymentPct", "priceIndex", "payrollJobsThousands", "hourlyEarnings", "policyRatePct", "treasury10Pct", "mortgage30Pct"] if k in r})
qindex = {r["quarter"]: r["realOutput"] for r in quarterly}

doc = {
    "version": "macro-data-v1",
    "source": {"tag": "SOURCED", "asOf": "2026-10-12", "citation": BLS + "; FHFA MIRS table 26 (This product uses FHFA data but is neither endorsed nor certified by FHFA.); Freddie Mac Primary Mortgage Market Survey after 2019"},
    "monthly": history,
    "quarterlyRealOutput": [{"quarter": q, "realOutput": v} for q, v in sorted(qindex.items())],
    "annualCpi": [{"year": y, "index": v} for y, v in sorted(annual.items())],
    "bands": {
        "unemployment12MonthChangePoints": [round(bands["unemploymentPct"]["p05"], 4), round(bands["unemploymentPct"]["p95"], 4)],
        "prices12MonthChangePct": [round(bands["priceIndex"]["p05"], 4), round(bands["priceIndex"]["p95"], 4)],
        "payrollJobs12MonthChangePct": [round(bands["payrollJobsThousands"]["p05"], 4), round(bands["payrollJobsThousands"]["p95"], 4)],
        "outputAnnualizedQuarterlyGrowthPct": [round(output_band["p05"], 4), round(output_band["p95"], 4)],
        "maxOneMonthMove": {"unemploymentPoints": bands["unemploymentPct"]["maxOneMonthMove"], "pricesPct": round(bands["priceIndex"]["maxOneMonthMove"], 4), "payrollJobsPct": round(bands["payrollJobsThousands"]["maxOneMonthMove"], 4)},
        "citation": "5th to 95th percentile of each measure, 1990 to 2026; data/research/macro/series/bands.json and output-band.json.",
    },
}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "history.json").write_text(json.dumps(doc, separators=(",", ":")) + "\n")
(OUT / "parameters.json").write_text(json.dumps(P, indent=2) + "\n")
print("u*", u_mean, "pi*", pi_mean, len(history))
