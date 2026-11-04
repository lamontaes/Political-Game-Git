"""Compile eviction-filings-2026.json from the Eviction Lab and Census downloads.

Run with python3 -I from the repository root, passing the downloads folder, the methods text and
the output path, then format the output with prettier:

    python3 -I scripts/research/compile-eviction-filings.py <downloads-dir> <si-text> \
        data/research/housing/eviction-filings-2026.json
    npx prettier --write data/research/housing/eviction-filings-2026.json

The downloads (about 250 MB, the Eviction Tracking System file most of it) are not committed; each
is fetched from the URL data/research/housing/eviction-filings-README.md names, saved under its
bucket key with "/" replaced by "_", and checked against sourceSha256 in the output.

<si-text> is pdftotext -layout of estimating_eviction_supplementary_information.pdf; it is read
only to check this script's rates against the publisher's own Table S16 (2015).

Reads (all fetched 2026-11-01; URLs in data/research/housing/eviction-filings-README.md):
  estimating-eviction-prevalance-across-us_state_eviction_estimates_2000_2018.csv
  estimating-eviction-prevalance-across-us_national_eviction_estimates_2000_2018.csv
  ets_allstates_weekly_2020_2021.csv          (Eviction Tracking System, weekly, through 2026-10-04)
  acsdt1y2025-b25003.dat, acsdt1y2024-b25003.dat   (ACS 1-year tenure, renter-occupied = B25003_E003)
  census-state.txt                            (state FIPS to postal code)
  tab20_zcta520_county20_natl.txt             (ZCTA to county, to name the ETS ZIP-code sites)
"""
import csv
import datetime as dt
import hashlib
import json
import os
import re
import statistics
import sys
from collections import defaultdict

DL, SI_TEXT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
YEAR = 2018
ETS_YEARS = (2024, 2025)


def path(name):
    return os.path.join(DL, name)


def rate(filings, renters):
    return round(100.0 * filings / renters, 2)


# State FIPS -> postal code and name (Census reference file).
fips_postal, postal_name = {}, {}
with open(path("census-state.txt"), encoding="utf-8") as f:
    for row in csv.DictReader(f, delimiter="|"):
        fips_postal[row["STATE"]] = row["STUSAB"]
        postal_name[row["STUSAB"]] = row["STATE_NAME"]

# ---- Eviction Lab national and state estimates (Gromis et al. 2022) ----
national = None
with open(path("estimating-eviction-prevalance-across-us_national_eviction_estimates_2000_2018.csv"), newline="") as f:
    for row in csv.DictReader(f):
        if int(row["year"]) == YEAR:
            national = row
nat_renters = int(round(float(national["renting_hh"])))
nat_filings = float(national["filings_estimate"])
nat_threat = float(national["hh_threat_estimate"])
national_row = {
    "key": "US",
    "year": YEAR,
    "renterHouseholds": nat_renters,
    "filings": int(round(nat_filings)),
    "filingsLow": int(round(float(national["filings_ci_95_lower"]))),
    "filingsHigh": int(round(float(national["filings_ci_95_upper"]))),
    "rate": rate(nat_filings, nat_renters),
    "rateLow": rate(float(national["filings_ci_95_lower"]), nat_renters),
    "rateHigh": rate(float(national["filings_ci_95_upper"]), nat_renters),
    "threatenedHouseholds": int(round(nat_threat)),
    "threatenedRate": rate(nat_threat, nat_renters),
    "sourceRow": ",".join(national[k] for k in national),
}

state_rows, all_years, sample_rows = [], defaultdict(dict), {}
with open(path("estimating-eviction-prevalance-across-us_state_eviction_estimates_2000_2018.csv"), newline="") as f:
    for row in csv.DictReader(f):
        postal = fips_postal[row["FIPS_state"]]
        renters = int(row["renting_hh"])
        filings = int(row["filings_estimate"])
        all_years[postal][int(row["year"])] = (filings, renters)
        if int(row["year"]) != YEAR:
            continue
        sample_rows[postal] = ",".join(row[k] for k in row)
        lo, hi = int(row["filings_ci_95_lower"]), int(row["filings_ci_95_upper"])
        threat = int(row["hh_threat_estimate"])
        court = row["ind_filings_court_issued"] == "1"
        state_rows.append([
            postal,
            row["FIPS_state"],
            "SOURCED",
            YEAR,
            renters,
            filings,
            lo,
            hi,
            rate(filings, renters),
            rate(lo, renters),
            rate(hi, renters),
            "court" if court else "model",
            (row["ind_filings_court_issued_LT"] == "1") if court else None,
            threat,
            rate(threat, renters),
        ])
state_rows.sort(key=lambda r: r[0])
COLUMNS = [
    "key", "fips", "tag", "year", "renterHouseholds", "filings", "filingsLow", "filingsHigh",
    "rate", "rateLow", "rateHigh", "filingsFrom", "landlordTenantCount",
    "threatenedHouseholds", "threatenedRate",
]
I = {c: i for i, c in enumerate(COLUMNS)}

# Check: this script's 2015 rates against the publisher's Table S16 (2015 state filing rates).
s16 = {}
with open(SI_TEXT, encoding="utf-8") as f:
    text = f.read()
block = text[text.index("Table S16. Average state-level eviction filing rates"):]
block = block[: block.index(" Mean")]
name_to_postal = {v.lower(): k for k, v in postal_name.items()}
name_to_postal["washington dc"] = "DC"
for name, val in re.findall(r"([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)*)\s+(\d+\.\d\d)", block):
    key = name_to_postal.get(name.strip().lower())
    if key:
        s16[key] = float(val)
s16_check = []
for key, published in sorted(s16.items()):
    filings, renters = all_years[key][2015]
    mine = rate(filings, renters)
    s16_check.append({"key": key, "tableS16": published, "computed": mine, "difference": round(mine - published, 2)})
s16_max_diff = max(abs(c["difference"]) for c in s16_check)

# ---- Eviction Tracking System, weekly, all state sites ----
# The file's state column is filled only on its first site's rows (and names that site "missouri"
# although its tracts are FIPS 05), so sites are read as blocks in file order: a tract block by
# its tracts' state FIPS, a ZIP block by the state holding most of its ZCTAs' land, and each
# "sealed" block (filings with no usable address) belongs to the block just before it.
zcta_state = {}
best = {}
with open(path("tab20_zcta520_county20_natl.txt"), encoding="utf-8-sig") as f:
    for row in csv.DictReader(f, delimiter="|"):
        z, c = row["GEOID_ZCTA5_20"], row["GEOID_COUNTY_20"]
        if not z or not c:
            continue
        land = int(row["AREALAND_PART"] or 0)
        if land >= best.get(z, -1):
            best[z] = land
            zcta_state[z] = c[:2]
county_total = defaultdict(set)
with open(path("tab20_zcta520_county20_natl.txt"), encoding="utf-8-sig") as f:
    for row in csv.DictReader(f, delimiter="|"):
        c = row["GEOID_COUNTY_20"]
        if c:
            county_total[c[:2]].add(c)


def week_split(week_date):
    """Each week's count is split over the calendar years its seven days fall in, a seventh per
    day, so a year's total covers exactly its own days (ETS counts by week, not by day)."""
    start = dt.date.fromisoformat(week_date)
    out = defaultdict(float)
    for i in range(7):
        out[(start + dt.timedelta(days=i)).year] += 1.0 / 7.0
    return out


_split_cache = {}


blocks, cur = [], None
last_week = None
with open(path("ets_allstates_weekly_2020_2021.csv"), newline="") as f:
    for row in csv.DictReader(f):
        g, kind = row["GEOID"], ("tract" if row["type"] == "Census Tract" else "zip")
        wd = row["week_date"]
        split = _split_cache.get(wd)
        if split is None:
            split = _split_cache[wd] = week_split(wd)
        last_week = max(last_week or wd, wd)
        v = float(row["filings_2020"] or 0)
        if g == "sealed":
            for y, share in split.items():
                cur["sealed"][y] += v * share
            continue
        key = g[:2] if kind == "tract" else zcta_state.get(g)
        same = (
            cur is not None and cur["kind"] == kind and not cur["sealed"]
            and (kind == "zip" or key in cur["fips"])
        )
        if not same:
            cur = {"kind": kind, "fips": defaultdict(float), "units": set(), "rows": defaultdict(float),
                   "sealed": defaultdict(float), "weeks": set(), "unmatchedZips": set()}
            blocks.append(cur)
        if key is None:
            cur["unmatchedZips"].add(g)
        else:
            cur["fips"][key] += v
        cur["units"].add(g[:5] if kind == "tract" else g)
        for y, share in split.items():
            cur["rows"][y] += v * share
        cur["weeks"].add(wd)


def acs_renters(year):
    out = {}
    with open(path("acsdt1y%d-b25003.dat" % year), encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="|"):
            gid = row["GEO_ID"]
            if gid.startswith("0400000US"):
                out[gid[-2:]] = (int(row["B25003_E003"]), int(row["B25003_M003"]))
            elif gid == "0100000US":
                out["US"] = (int(row["B25003_E003"]), int(row["B25003_M003"]))
    return out


acs = {y: acs_renters(y) for y in ETS_YEARS}


def days_in_year(weeks, y):
    days = set()
    for wd in weeks:
        start = dt.date.fromisoformat(wd)
        for i in range(7):
            d = start + dt.timedelta(days=i)
            if d.year == y:
                days.add(d)
    return len(days)
ets_rows, ets_sites = [], []
ETS_COLUMNS = ["key", "fips", "tag", "year", "renterHouseholds", "renterHouseholdsMoe", "filings",
               "filingsWithAddress", "filingsSealed", "days", "rate", "estimate2018Rate"]
est = {r[I["key"]]: r for r in state_rows}
for b in blocks:
    fips = max(b["fips"], key=b["fips"].get)
    postal = fips_postal[fips]
    total_f = sum(b["fips"].values())
    site = {
        "key": postal,
        "geography": "census tract" if b["kind"] == "tract" else "ZIP code",
        "firstWeek": min(b["weeks"]),
        "lastWeek": max(b["weeks"]),
    }
    if b["kind"] == "tract":
        site["countiesWithRows"] = len(b["units"])
        site["countiesInState"] = len(county_total[fips])
        site["missingCounties"] = sorted(county_total[fips] - b["units"])
    else:
        site["zipCodes"] = len(b["units"])
        site["shareOfFilingsInZipsOfThisState"] = round(b["fips"][fips] / total_f, 4)
        site["zipCodesWithNoZcta"] = len(b["unmatchedZips"])
    ets_sites.append(site)
    for y in ETS_YEARS:
        with_addr, sealed = b["rows"][y], b["sealed"][y]
        filings = int(round(with_addr + sealed))
        renters, moe = acs[y][fips]
        ets_rows.append([
            postal, fips, "SOURCED", y, renters, moe, filings, int(round(with_addr)), int(round(sealed)),
            days_in_year(b["weeks"], y), rate(filings, renters), est[postal][I["rate"]],
        ])
ets_rows.sort(key=lambda r: (r[0], r[3]))

# ---- Places the Eviction Lab does not cover: the median of the 51 sourced rates ----
rates = [r[I["rate"]] for r in state_rows]
median_rate = round(statistics.median(rates), 2)
missing = [p for p in ("PR", "GU", "VI", "AS", "MP")]
estimated_rows = []
for p in missing:
    estimated_rows.append([
        p, [k for k, v in fips_postal.items() if v == p][0], "ESTIMATED", YEAR, None, None, None, None,
        median_rate, min(rates), max(rates), None, None, None, None,
    ])

# ---- Spread across the 50 states and D.C. ----
def pct(sorted_vals, q):
    # linear interpolation between closest ranks
    pos = (len(sorted_vals) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(sorted_vals) - 1)
    return round(sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (pos - lo), 2)


srt = sorted(state_rows, key=lambda r: r[I["rate"]])
vals = [r[I["rate"]] for r in srt]
no_md = [r for r in srt if r[I["key"]] != "MD"]
court_rows = [r for r in srt if r[I["filingsFrom"]] == "court"]
spread = {
    "unit": "eviction filings per 100 renter households, 2018",
    "places": len(vals),
    "low": {"key": srt[0][I["key"]], "rate": srt[0][I["rate"]]},
    "high": {"key": srt[-1][I["key"]], "rate": srt[-1][I["rate"]]},
    "median": round(statistics.median(vals), 2),
    "p10": pct(vals, 0.10),
    "p90": pct(vals, 0.90),
    "lowest5": [[r[I["key"]], r[I["rate"]]] for r in srt[:5]],
    "highest5": [[r[I["key"]], r[I["rate"]]] for r in srt[-5:]],
    "withoutMaryland": {
        "low": {"key": no_md[0][I["key"]], "rate": no_md[0][I["rate"]]},
        "high": {"key": no_md[-1][I["key"]], "rate": no_md[-1][I["rate"]]},
        "why": "Maryland's filing is itself the notice and a tenant who pays stays, so landlords file month after month; the publisher reports it as the outlier (supplementary information section 5.3).",
    },
    "courtIssuedOnly": {
        "places": len(court_rows),
        "low": {"key": court_rows[0][I["key"]], "rate": court_rows[0][I["rate"]]},
        "high": {"key": court_rows[-1][I["key"]], "rate": court_rows[-1][I["rate"]]},
    },
    "threatenedHouseholds": {
        "unit": "households with at least one filing per 100 renter households, 2018",
        "low": min(([r[I["key"]], r[I["threatenedRate"]]] for r in state_rows), key=lambda x: x[1]),
        "high": max(([r[I["key"]], r[I["threatenedRate"]]] for r in state_rows), key=lambda x: x[1]),
        "national": national_row["threatenedRate"],
    },
}

doc = {
    "id": "eviction-filings-2026",
    "publisher": "Eviction Lab, Princeton University (Gromis, Fellows, Hendrickson, Edmonds, Leung, Porton and Desmond, Estimating Eviction Prevalence across the United States, PNAS 2022; data deposited May 13, 2022)",
    "vintage": "2018 (the latest year of the Eviction Lab's estimates, the only national series covering all 50 states and D.C.); Eviction Tracking System 2024 and 2025 for the 11 states it covers statewide",
    "table": "state_eviction_estimates_2000_2018.csv and national_eviction_estimates_2000_2018.csv (estimating-eviction-prevalance-across-us/); ETS allstates_weekly_2020_2021.csv (ets/); ACS 1-year B25003",
    "title": "Eviction filings per 100 renter households, by state",
    "universe": "Residential eviction cases filed in court (commercial cases removed) in a calendar year, over renting households",
    "geography": "50 states and D.C. (rows); United States (national); Puerto Rico, Guam, U.S. Virgin Islands, American Samoa and the Northern Mariana Islands as estimated rows (no Eviction Lab data)",
    "sourceUrl": "https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/state_eviction_estimates_2000_2018.csv",
    "nationalUrl": "https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/national_eviction_estimates_2000_2018.csv",
    "methodsUrl": "https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/estimating_eviction_supplementary_information.pdf",
    "readmeUrl": "https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/README_estimating_eviction.txt",
    "etsUrl": "https://eviction-lab-data-downloads.s3.amazonaws.com/ets/allstates_weekly_2020_2021.csv",
    "renterHouseholdsUrl": "https://www2.census.gov/programs-surveys/acs/summary_file/2025/table-based-SF/data/1YRData/acsdt1y2025-b25003.dat",
    "browseUrl": "https://data-downloads.evictionlab.org/",
    "license": "Open Data Commons Attribution License (named on the data-downloads page)",
    "retrievedOn": "2026-11-01",
    "compiledBy": "scripts/research/compile-eviction-filings.py (see data/research/housing/eviction-filings-README.md)",
    "tag": "by row: the 51 state rows and the national row SOURCED (rate computed here as filings / renting households x 100 from the publisher's two columns); the five territory rows ESTIMATED (median of the 51)",
    "limits": "Filings, not evictions: a filing is a court case, many end with the tenant staying, and one household can draw several filings in a year (households threatened is the unique count). Renting households are the publisher's own denominator (block groups interpolated from the 2000 and 2010 Censuses and 2016 ESRI Business Analyst, extrapolated to 2018), not the ACS. A state row whose filingsFrom is court is court-issued counts for every county (its credible interval is the count itself, or a small band where landlordTenantCount is true and non-eviction landlord-tenant cases were modeled out); a row whose filingsFrom is model is a Bayesian estimate from partial court data, LexisNexis records and county covariates, with a 95% credible interval in filingsLow and filingsHigh (Idaho and West Virginia have the widest). 2018 is before the pandemic moratoria; national filings were 7.8 per 100 then. Maryland (69.6) is an outlier by law, not by distress: the filing is the notice and paying cures it. The Eviction Lab has no data for Puerto Rico or the four island areas; their rows are the median of the 51 sourced rates, tagged ESTIMATED. The ETS rows are observed statewide court filings for 2024 and 2025 (each week's count split over the calendar years of its seven days, a seventh per day) over ACS 1-year renter-occupied households of the same year, a different denominator from the 2018 rows; ETS counts by the defendant's address and its sealed rows are filings with no usable address, counted in the state total.",
    "columns": COLUMNS,
    "columnNotes": {
        "rate": "filings per 100 renter households (filings / renterHouseholds x 100, rounded to 2 places)",
        "rateLow, rateHigh": "the 95% credible interval of filings over the same renter households",
        "filingsFrom": "court: the publisher observed filings in court-issued data for all counties (ind_filings_court_issued = 1); model: Bayesian estimate",
        "landlordTenantCount": "true when the court counts were all landlord-tenant cases and the publisher adjusted them down to eviction cases (ind_filings_court_issued_LT); null for model rows",
        "threatenedRate": "households with at least one filing per 100 renter households",
    },
    "national": national_row,
    "spread": spread,
    "rows": state_rows,
    "estimatedRows": {
        "why": "The Eviction Lab collected records from the 50 states and D.C. only (supplementary information section 1); Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and the Northern Mariana Islands have no rows. Each takes the median of the 51 sourced 2018 rates; rateLow and rateHigh are the lowest and highest of the 51.",
        "rows": estimated_rows,
    },
    "ets": {
        "about": "The Eviction Lab's Eviction Tracking System: weekly residential filings from state courts, 2020 to 2026-10-04 (last_updated 2026-10-10), for 11 state sites. Read here for 2024 and 2025 only, as a recent cross-check on the 2018 rows, not in place of them: a rate over ACS renter households is not the same measure as the 2018 rows' rate over the publisher's denominator.",
        "fileDefect": "The file's state column is filled only on its first site's rows and names that site \"missouri\" although its 75 counties are FIPS 05; the script names each site by its tracts' FIPS or its ZIP codes' state.",
        "sites": ets_sites,
        "columns": ETS_COLUMNS,
        "rows": ets_rows,
        "nationalRenterHouseholds": {str(y): acs[y]["US"][0] for y in ETS_YEARS},
    },
    "checks": {
        "nationalRateMatchesParameterCitation": national_row["rate"] == 7.8,
        "tableS16": {
            "what": "This script's 2015 state rates (filings_estimate / renting_hh x 100 from the same file) against the publisher's Table S16, Average state-level eviction filing rates by data source, 2015 (supplementary information page S-58)",
            "states": len(s16_check),
            "largestDifference": s16_max_diff,
            "rows": s16_check,
        },
    },
}

def sha256(name):
    h = hashlib.sha256()
    with open(path(name), "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


doc["sourceSha256"] = {name: sha256(name) for name in (
    "estimating-eviction-prevalance-across-us_state_eviction_estimates_2000_2018.csv",
    "estimating-eviction-prevalance-across-us_national_eviction_estimates_2000_2018.csv",
    "ets_allstates_weekly_2020_2021.csv",
    "acsdt1y2025-b25003.dat",
    "acsdt1y2024-b25003.dat",
)}
doc["sampleSourceRows"] = {"CT": sample_rows["CT"], "MD": sample_rows["MD"], "SD": sample_rows["SD"]}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(doc, f, indent=2)
    f.write("\n")

print("national", national_row["rate"], "states", len(state_rows), "low", spread["low"], "high", spread["high"])
print("CT", [r for r in state_rows if r[0] == "CT"])
print("S16 states", len(s16_check), "max diff", s16_max_diff)
for s in ets_sites:
    print("ETS", s)
for r in ets_rows:
    print("ETS row", r)
