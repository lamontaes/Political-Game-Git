"""Write src/core2/data/regional/{regions,parameters}.json.

Regions: each state's largest metro area by in-state population, its second
when that one has at least `SECOND_METRO_SHARE` of the largest's population,
and the rest of the state. Territories without CBSA rows are one region each.
"""
import gzip, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[3]
HERE = pathlib.Path(__file__).parent
OUT = ROOT / "src/core2/data/regional"
SECOND_METRO_SHARE = 0.4
cbsa = json.load(gzip.open(ROOT / "data/source/cbsa-delineations/regional-corpus.json.gz"))["rows"]
lb = json.load(open(ROOT / "data/tables/local-business-counts.json"))
pop = {}
for row in lb["COUNTY_BUSINESS_ROWS"].split(";"):
    fips, rest = row.split(":"); v = int(rest.split(",")[0]); pop[fips] = v
# Counties BEA leaves out (Puerto Rico's municipios): the sum of their ACS 2024 place populations.
acs = json.load(open(ROOT / "data/research/money/place-population-acs-2024.json"))["placeCounties"]
acs_county = {}
for parts in acs.values():
    for county, people in parts:
        acs_county[county] = acs_county.get(county, 0) + people
for county, people in acs_county.items():
    if not pop.get(county): pop[county] = people
te = json.load(open(ROOT / "data/tables/town-employment.json"))
sectors = te["TOWN_EMPLOYMENT_META"]["sectors"]
county_sector = {}
for row in te["COUNTY_SECTOR_EMPLOYMENT"].split(";"):
    fips, rest = row.split(":")
    county_sector[fips] = [int(x) if x else 0 for x in rest.split(",")]  # withheld cells count as zero
public = {}
for row in te["STATE_PUBLIC_EMPLOYMENT"].split(";"):
    fips, rest = row.split(":"); v = rest.split(","); public[fips] = sum(int(x) for x in v[1:4] if x)  # federal, state, local
SUPER = {"11": "mining-logging", "21": "mining-logging", "22": "trade-transport-utilities", "23": "construction", "31": "manufacturing", "42": "trade-transport-utilities", "44": "trade-transport-utilities", "48": "trade-transport-utilities", "51": "information", "52": "financial", "53": "financial", "54": "professional-business", "55": "professional-business", "56": "professional-business", "61": "education-health", "62": "education-health", "71": "leisure-hospitality", "72": "leisure-hospitality", "81": "other-services"}
bea = json.load(open(ROOT / "data/source/bea-regional/corpus.json"))
rpp = {}  # (table, fips) -> {year: value}
income = {}  # county fips -> (personal income thousands, population) 2024
for r in bea:
    v = r["value"].get("value")
    if v is None: continue
    if r["tableName"] in ("SARPP", "MARPP") and r["lineCode"] == "1":
        rpp.setdefault((r["tableName"], r["geoFips"]), {})[r["year"]] = v
    if r["tableName"] == "CAINC1" and r["year"] == "2024" and r["lineCode"] in ("1", "2"):
        income.setdefault(r["geoFips"], {})[r["lineCode"]] = v
monthly = json.load(open(HERE / "series/state-monthly.json"))
metro_u = json.load(open(HERE / "series/metro-unemployment.json"))
stats = json.load(open(HERE / "series/stats.json"))

by_state = {}
for row in cbsa:
    by_state.setdefault(row["stateFips"], {"usps": row["stateAbbreviation"], "name": row["state"], "counties": []})["counties"].append(row)
regions, county_region = [], {}
def mix_of(counties, state_fips, state_pop):
    totals = {}
    for c in counties:
        for code, v in zip(sectors, county_sector.get(c, [])):
            totals[SUPER[code]] = totals.get(SUPER[code], 0) + v
    if not sum(totals.values()): return {}  # no CBP rows (Puerto Rico): the region follows the nation's mix
    share = sum(pop.get(c, 0) for c in counties) / state_pop if state_pop else 0
    totals["government"] = public.get(state_fips, 0) * share
    total = sum(totals.values())
    return {k: round(v / total, 5) for k, v in sorted(totals.items())} if total else {}
def income_of(counties):
    pi = sum(income.get(c, {}).get("1", 0) for c in counties); pp = sum(income.get(c, {}).get("2", 0) for c in counties)
    return round(pi * 1000 / pp, 2) if pp else None
for fips, state in sorted(by_state.items()):
    counties = state["counties"]; state_pop = sum(pop.get(c["countyFips"], 0) for c in counties)
    metros = {}
    for c in counties:
        if c["cbsaClassification"] == "Metropolitan Statistical Area":
            metros.setdefault(c["cbsaCode"], []).append(c)
    ranked = sorted(metros.items(), key=lambda kv: -sum(pop.get(c["countyFips"], 0) for c in kv[1]))
    chosen = ranked[:1]
    if len(ranked) > 1:
        a = sum(pop.get(c["countyFips"], 0) for c in ranked[0][1]); b = sum(pop.get(c["countyFips"], 0) for c in ranked[1][1])
        if b >= SECOND_METRO_SHARE * a: chosen = ranked[:2]
    used = set()
    for code, members in chosen:
        ids = sorted(c["countyFips"] for c in members); used.update(ids)
        laus = next((k for k in [fips + code] if k in metro_u), None) or next((k for k in metro_u if k[2:] == code), None)
        regions.append({"id": f"region:{fips}:metro:{code}", "stateFips": fips, "stateUsps": state["usps"], "kind": "metro", "cbsaCode": code, "title": members[0]["oewsAreaTitle"], "counties": ids, "population": sum(pop.get(c, 0) for c in ids), "mix": mix_of(ids, fips, state_pop), "rppPct": rpp.get(("MARPP", code), {}), "perCapitaIncome": income_of(ids), "lausMetroCode": laus})
    rest = sorted(c["countyFips"] for c in counties if c["countyFips"] not in used)
    if rest:
        regions.append({"id": f"region:{fips}:rest", "stateFips": fips, "stateUsps": state["usps"], "kind": "rest-of-state", "counties": rest, "population": sum(pop.get(c, 0) for c in rest), "mix": mix_of(rest, fips, state_pop), "rppPct": {}, "perCapitaIncome": income_of(rest), "lausMetroCode": None})
    for r in regions:
        if r["stateFips"] == fips:
            for c in r["counties"]: county_region[c] = r["id"]
states = {fips: {"usps": s["usps"], "name": s["name"], "rppPct": rpp.get(("SARPP", fips + "000"), {}), "perCapitaIncome": income_of([c["countyFips"] for c in s["counties"]]), "population": sum(pop.get(c["countyFips"], 0) for c in s["counties"])} for fips, s in sorted(by_state.items())}
# Territories outside the CBSA corpus: one region each, figures estimated from the nation.
# 2020 Census of the Island Areas, total population (census.gov/programs-surveys/decennial-census/decade/2020/planning-management/release/2020-island-areas-data-products.html).
for fips, usps, name, people in [("60", "AS", "American Samoa", 49710), ("66", "GU", "Guam", 153836), ("69", "MP", "Northern Mariana Islands", 47329), ("78", "VI", "U.S. Virgin Islands", 87146)]:
    if fips in by_state: continue
    states[fips] = {"usps": usps, "name": name, "rppPct": {}, "perCapitaIncome": None, "population": people, "estimatedFromNation": True}
    regions.append({"id": f"region:{fips}:territory", "stateFips": fips, "stateUsps": usps, "kind": "territory", "counties": [], "population": people, "mix": {}, "rppPct": {}, "perCapitaIncome": None, "lausMetroCode": None})
keep_metros = {r["lausMetroCode"]: metro_u[r["lausMetroCode"]] for r in regions if r.get("lausMetroCode")}
doc = {
    "version": "regions-v1",
    "source": {"tag": "SOURCED", "asOf": "2026-10-12", "citation": "Census CBSA delineations July 2023; BEA CAINC1 2024 county population and personal income; Census County Business Patterns 2023 March employment by NAICS sector; BLS OEWS May 2025 state public employment; BEA SARPP and MARPP regional price parities 2019, 2023, 2024; BLS LAUS state (seasonally adjusted) and metro (not seasonally adjusted) unemployment rates; BLS CES state total nonfarm (seasonally adjusted) and total private average hourly earnings, from 2015."},
    "rules": {"secondMetroShareOfLargest": SECOND_METRO_SHARE, "withheldCbpCells": "zero", "noCbpRows": "empty mix: the region follows the national mix", "governmentShare": "state public employment by the region's population share", "missingCountyPopulation": "sum of the county's ACS 2024 place populations (data/research/money/place-population-acs-2024.json)"},
    "nation": {"perCapitaIncome": round(income["00000"]["1"] * 1000 / income["00000"]["2"], 2), "population": sum(pop.values())},
    "regions": regions, "states": states, "countyRegion": county_region,
    "series": {"stateUnemploymentPct": monthly["unemploymentPct"], "stateJobsThousands": monthly["jobsThousands"], "stateHourlyEarnings": monthly["hourlyEarnings"], "metroUnemploymentPct": keep_metros},
}
(OUT / "regions.json").write_text(json.dumps(doc, separators=(",", ":")) + "\n")
def sourced(value, citation, low=None, high=None, unit=None):
    row = {"value": value, "tag": "SOURCED", "citation": citation}
    if low is not None: row["spread"] = {"low": low, "high": high, "unit": unit, "citation": citation}
    return row
P = {}
for name, b in stats["sectorBetas"].items():
    key = "".join(w.capitalize() for w in name.split("-"))
    P[f"regionalSector{key}TrendMonthlyPct"] = sourced(round(b["intercept"], 5), f"OLS of national CES {name} monthly employment growth on total nonfarm growth, 1990-2019, intercept SE {b['seIntercept']:.3f}.", round(b["intercept"] - 2 * b["seIntercept"], 5), round(b["intercept"] + 2 * b["seIntercept"], 5), "percent per month")
    P[f"regionalSector{key}Beta"] = sourced(round(b["beta"], 4), f"Same regression, slope on national job growth, SE {b['seBeta']:.3f}.", round(b["beta"] - 2 * b["seBeta"], 4), round(b["beta"] + 2 * b["seBeta"], 4), "points per national point")
g = stats["stateUnemploymentGapPersistence"]
P["regionalUnemploymentGapPersistence"] = sourced(round(g["rho"], 5), f"Pooled AR(1) of the state unemployment rate less the national rate, LAUS {g['window']}, SE {g['se']:.4f}.", round(g["rho"] - 2 * g["se"], 5), min(1, round(g["rho"] + 2 * g["se"], 5)), "monthly coefficient")
P["regionalNationalMeanMonthlyJobGrowthPct"] = sourced(round(stats["nationalMeanMonthlyJobGrowthPct"], 5), "Mean monthly national payroll growth 1990-2019, BLS CES0000000001.")
(OUT / "parameters.json").write_text(json.dumps(P, indent=2) + "\n")
print(len(regions), sum(1 for r in regions if r["kind"] == "metro"), (OUT / "regions.json").stat().st_size)
