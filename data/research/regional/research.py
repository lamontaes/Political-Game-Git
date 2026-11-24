"""Regional research from BLS flat files (LAUS states and metros, CES national
supersectors, CES state total nonfarm and average hourly earnings).

Usage: python3 -B data/research/regional/research.py <raw-dir>
Raw files (download.bls.gov/pub/time.series/, retrieved 2026-10-12, not kept):
la/la.data.3.AllStatesS, la/la.data.60.Metro, la/la.area,
ce/ce.data.*.Employment (supersector), sm/sm.data.* (state files, filtered to
total nonfarm ...0000000001 and total private hourly earnings ...0500000003).
"""
import hashlib, json, math, pathlib, re, sys
import numpy as np

RAW = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(__file__).parent / "series"
def rows(path):
    for line in (RAW / path).read_text().splitlines()[0:]:
        parts = [p.strip() for p in line.split("\t")]
        if len(parts) < 4 or not re.fullmatch(r"M(0[1-9]|1[0-2])", parts[2]) or parts[3] in ("-", ""): continue
        yield parts[0], f"{parts[1]}-{parts[2][1:]}", float(parts[3])
def shift(m, n):
    y, mo = map(int, m.split("-")); t = y * 12 + mo - 1 + n
    return f"{t // 12}-{t % 12 + 1:02d}"
def ols(X, y):
    X, y = np.array(X), np.array(y); b = np.linalg.lstsq(X, y, rcond=None)[0]
    e = y - X @ b; s2 = e @ e / (len(y) - X.shape[1]); se = np.sqrt(np.diag(s2 * np.linalg.inv(X.T @ X)))
    return [float(v) for v in b], [float(v) for v in se], len(y)

# National supersectors: monthly log growth on total nonfarm growth, 1990-2019.
total = {m: v for s, m, v in rows("../macro-raw/ces.tsv")} if (RAW / "../macro-raw/ces.tsv").exists() else None
SUPER = {"10": "mining-logging", "20": "construction", "30": "manufacturing", "40": "trade-transport-utilities", "50": "information", "55": "financial", "60": "professional-business", "65": "education-health", "70": "leisure-hospitality", "80": "other-services", "90": "government"}
sectors = {}
for f in sorted(RAW.glob("ce-*.tsv")):
    code = f.name[3:5]
    sectors[code] = {m: v for s, m, v in rows(f.name)}
if total is None:
    total = {}
    for code, series in sectors.items():
        for m, v in series.items(): total[m] = total.get(m, 0) + v
betas = {}
for code, series in sectors.items():
    X, y = [], []
    for m in series:
        p = shift(m, -1)
        if not ("1990-01" <= m <= "2019-12") or p not in series or p not in total or m not in total: continue
        X.append([1, math.log(total[m] / total[p]) * 100]); y.append(math.log(series[m] / series[p]) * 100)
    b, se, n = ols(X, y)
    meanTotal = float(np.mean([x[1] for x in X]))
    betas[SUPER[code]] = {"trendMonthlyPct": b[0] + b[1] * meanTotal - b[1] * meanTotal, "intercept": b[0], "beta": b[1], "seIntercept": se[0], "seBeta": se[1], "months": n}
national_mean_growth = float(np.mean([math.log(total[m] / total[shift(m, -1)]) * 100 for m in total if "1990-01" <= m <= "2019-12" and shift(m, -1) in total]))

# LAUS states (seasonally adjusted rate, measure 03) and nation.
state_u = {}
for s, m, v in rows("la.data.3.AllStatesS"):
    if s.startswith("LASST") and s.endswith("03"): state_u.setdefault(s[5:7], {})[m] = v
nat_u = {m: v for s, m, v in rows("../macro-raw/unrate.tsv")}
X, y = [], []
for fips, series in state_u.items():
    for m, v in series.items():
        p = shift(m, -1)
        if "2000-01" <= m <= "2019-12" and p in series and m in nat_u and p in nat_u:
            X.append([series[p] - nat_u[p]]); y.append(v - nat_u[m])
gap_rho, gap_se, gap_n = ols(X, y)

# Metro unemployment (not seasonally adjusted rate) by LAUS metro code.
metro_u = {}
for s, m, v in rows("la.data.60.Metro"):
    if s.startswith("LAUMT") and s.endswith("03") and m >= "2015-01": metro_u.setdefault(s[5:12], {})[m] = v
# State jobs (SA) and hourly pay (NSA, total private).
state_jobs, state_ahe = {}, {}
for s, m, v in rows("sm-state-ahe-jobs.tsv"):
    fips = s[3:5]
    if s.startswith("SMS") and s.endswith("0000000001"): state_jobs.setdefault(fips, {})[m] = v
    if s.startswith("SMU") and s.endswith("0500000003"): state_ahe.setdefault(fips, {})[m] = v
def yoy(series, first):
    return [(series[m] / series[shift(m, -12)] - 1) * 100 for m in series if m >= first and m[5:] == "12" and shift(m, -12) in series]
def pct(vals, q): return float(np.percentile(vals, q))
jobs_yoy = [v for f, s in state_jobs.items() if f != "00" for v in yoy(s, "2000-12")]
ahe_yoy = [v for f, s in state_ahe.items() if f != "00" for v in yoy(s, "2008-12")]
stats = {
    "sectorBetas": betas, "nationalMeanMonthlyJobGrowthPct": national_mean_growth,
    "stateUnemploymentGapPersistence": {"rho": gap_rho[0], "se": gap_se[0], "months": gap_n, "window": "2000-01 to 2019-12, LAUS seasonally adjusted state rate less the national rate"},
    "stateOneYearJobGrowthPct": {"p05": pct(jobs_yoy, 5), "p95": pct(jobs_yoy, 95), "n": len(jobs_yoy), "window": "December over December, 2000-2025, CES state total nonfarm (SA)"},
    "stateOneYearPayGrowthPct": {"p05": pct(ahe_yoy, 5), "p95": pct(ahe_yoy, 95), "n": len(ahe_yoy), "window": "December over December, 2008-2025, CES state total private average hourly earnings (NSA)"},
}
OUT.mkdir(parents=True, exist_ok=True)
keep = lambda series: {m: v for m, v in sorted(series.items()) if m >= "2015-01"}
(OUT / "stats.json").write_text(json.dumps(stats, indent=2) + "\n")
(OUT / "state-monthly.json").write_text(json.dumps({"unemploymentPct": {f: keep(s) for f, s in state_u.items()}, "jobsThousands": {f: keep(s) for f, s in state_jobs.items()}, "hourlyEarnings": {f: keep(s) for f, s in state_ahe.items()}}, separators=(",", ":")) + "\n")
(OUT / "metro-unemployment.json").write_text(json.dumps(metro_u, separators=(",", ":")) + "\n")
print(json.dumps(stats, indent=1)[:3000])
