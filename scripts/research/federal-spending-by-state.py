#!/usr/bin/env python3
"""Build data/research/federal/federal-spending-by-state-fy2024.json.

For each federal budget line the game uses, how many federal dollars reach each
of the 56 places per resident, relative to the national per-resident amount
(the "stake" ratio; 1.0 is the national average).

Source: USAspending.gov API, POST /api/v2/search/spending_by_geography/
(place of performance, state layer, fiscal year 2024, transaction obligations).
Population: BEA CAINC1 2024 (states and D.C.) already held in
data/research/money/population-2024.json; territories from the 2020 Census
figures already held in data/research/federal/defense-contracts-by-state-fy2024.json.

Run from the repository root:  python3 scripts/research/federal-spending-by-state.py
Needs outbound HTTPS to api.usaspending.gov (curl, proxy settings honored).
"""
import json
import statistics
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/research/federal/federal-spending-by-state-fy2024.json"
API = "https://api.usaspending.gov/api/v2/search/spending_by_geography/"
PERIOD = [{"start_date": "2023-10-01", "end_date": "2024-09-30"}]
# Contracts, grants, direct payments, other assistance. Loans (07, 08) and
# insurance (09 is "other"; 08 loans) are left out: they are not outlays.
AWARD_GROUPS = [["A", "B", "C", "D"], ["02", "03", "04", "05"], ["06", "10"], ["09", "11"]]

PLACES = (
    "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT "
    "NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC "
    "PR GU VI AS MP"
).split()
assert len(PLACES) == 56
FIPS = {
    "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06", "CO": "08", "CT": "09",
    "DE": "10", "DC": "11", "FL": "12", "GA": "13", "HI": "15", "ID": "16", "IL": "17",
    "IN": "18", "IA": "19", "KS": "20", "KY": "21", "LA": "22", "ME": "23", "MD": "24",
    "MA": "25", "MI": "26", "MN": "27", "MS": "28", "MO": "29", "MT": "30", "NE": "31",
    "NV": "32", "NH": "33", "NJ": "34", "NM": "35", "NY": "36", "NC": "37", "ND": "38",
    "OH": "39", "OK": "40", "OR": "41", "PA": "42", "RI": "44", "SC": "45", "SD": "46",
    "TN": "47", "TX": "48", "UT": "49", "VT": "50", "VA": "51", "WA": "53", "WV": "54",
    "WI": "55", "WY": "56",
}


def top(name):
    return {"type": "awarding", "tier": "toptier", "name": name}


def sub(name, toptier):
    return {"type": "awarding", "tier": "subtier", "name": name, "toptier_name": toptier}


USDA, HHS = "Department of Agriculture", "Department of Health and Human Services"
FNS = sub("Food and Nutrition Service", USDA)
FS = sub("Forest Service", USDA)
ACF = sub("Administration for Children and Families", HHS)
MEDICARE = ["93.770", "93.773", "93.774"]
CDBG = ["14.218", "14.228", "14.239", "14.248", "14.255", "14.256"]
UI = ["17.225"]
SSI = ["96.006"]
SSA_BENEFITS = ["96.001", "96.002", "96.004"]


def ag(*a):
    return {"agencies": list(a)}


def prog(*p):
    return {"program_numbers": list(p)}


def both(a, p):
    return {"agencies": [a], "program_numbers": list(p)}


# Each line: (description, [(sign, filters, label), ...]). A negative component
# is subtracted so no dollar is counted in two lines.
LINES = {
    "nationalDefense": ("Department of Defense, all contracts, grants, direct payments and other assistance",
                        [(1, ag(top("Department of Defense")), "Department of Defense")]),
    "internationalAffairs": ("Department of State, USAID, Peace Corps, Millennium Challenge Corporation, Inter-American Foundation, African Development Foundation, Trade and Development Agency",
                             [(1, ag(top(n)), n) for n in (
                                 "Department of State", "Agency for International Development", "Peace Corps",
                                 "Millennium Challenge Corporation", "Inter-American Foundation",
                                 "African Development Foundation", "United States Trade and Development Agency")]),
    "naturalResources": ("Department of the Interior, Environmental Protection Agency, Corps of Engineers Civil Works, USDA Forest Service",
                         [(1, ag(top("Department of the Interior")), "Interior"),
                          (1, ag(top("Environmental Protection Agency")), "EPA"),
                          (1, ag(top("Corps of Engineers - Civil Works")), "Corps of Engineers Civil Works"),
                          (1, ag(FS), "Forest Service")]),
    "agriculture": ("Department of Agriculture, less Food and Nutrition Service (income security) and Forest Service (natural resources)",
                    [(1, ag(top(USDA)), "USDA"), (-1, ag(FNS), "less Food and Nutrition Service"),
                     (-1, ag(FS), "less Forest Service")]),
    "transportation": ("Department of Transportation",
                       [(1, ag(top("Department of Transportation")), "Department of Transportation")]),
    "communityAndRegionalDevelopment": ("FEMA, Small Business Administration, Economic Development Administration, Appalachian Regional Commission, Delta Regional Authority, HUD community development block grant programs",
                                        [(1, ag(sub("Federal Emergency Management Agency", "Department of Homeland Security")), "FEMA"),
                                         (1, ag(top("Small Business Administration")), "SBA"),
                                         (1, ag(sub("Economic Development Administration", "Department of Commerce")), "EDA"),
                                         (1, ag(top("Appalachian Regional Commission")), "ARC"),
                                         (1, ag(top("Delta Regional Authority")), "DRA"),
                                         (1, prog(*CDBG), "HUD CDBG programs " + ", ".join(CDBG))]),
    "education": ("Department of Education plus Department of Labor, less unemployment insurance (income security)",
                  [(1, ag(top("Department of Education")), "Department of Education"),
                   (1, ag(top("Department of Labor")), "Department of Labor"),
                   (-1, prog(*UI), "less unemployment insurance 17.225")]),
    "health": ("Department of Health and Human Services (Medicaid 93.778, NIH, CDC, HRSA and the rest), less ACF (income security) and the Medicare programs",
               [(1, ag(top(HHS)), "HHS"), (-1, ag(ACF), "less ACF"),
                (-1, both(top(HHS), MEDICARE), "less Medicare programs " + ", ".join(MEDICARE))]),
    "medicare": ("Medicare assistance listings 93.770 (prescription drug), 93.773 (hospital insurance), 93.774 (supplementary medical insurance), as USAspending records them under HHS",
                 [(1, both(top(HHS), MEDICARE), "Medicare programs")]),
    "incomeSecurity": ("HUD (less community development grants), Food and Nutrition Service (SNAP, WIC, school meals), ACF (TANF, child care, foster care, LIHEAP), SSI 96.006, unemployment insurance 17.225",
                       [(1, ag(top("Department of Housing and Urban Development")), "HUD"),
                        (-1, prog(*CDBG), "less HUD CDBG programs"),
                        (1, ag(FNS), "Food and Nutrition Service"), (1, ag(ACF), "ACF"),
                        (1, prog(*SSI), "SSI 96.006"), (1, prog(*UI), "unemployment insurance 17.225")]),
    "socialSecurity": ("SSA assistance listings 96.001 (disability insurance), 96.002 (retirement insurance), 96.004 (survivors insurance), direct payments",
                       [(1, prog(*SSA_BENEFITS), "OASDI benefits")]),
    "veterans": ("Department of Veterans Affairs",
                 [(1, ag(top("Department of Veterans Affairs")), "Department of Veterans Affairs")]),
    "administration": ("General Services Administration, Department of the Treasury, Office of Personnel Management (awards only; federal retirement benefits are not in USAspending)",
                       [(1, ag(top(n)), n) for n in (
                           "General Services Administration", "Department of the Treasury", "Office of Personnel Management")]),
}


def post(filters):
    body = json.dumps({"scope": "place_of_performance", "geo_layer": "state",
                       "filters": dict(filters, time_period=PERIOD)})
    for attempt in range(5):
        r = subprocess.run(["curl", "-sS", "-m", "240", "-X", "POST", API,
                            "-H", "Content-Type: application/json", "-d", body],
                           capture_output=True, text=True)
        try:
            return json.loads(r.stdout)["results"]
        except Exception:
            time.sleep(3 * (attempt + 1))
    raise RuntimeError("USAspending request failed: " + body[:200])


def fetch(filters):
    out = {}
    for group in AWARD_GROUPS:
        for row in post(dict(filters, award_type_codes=group)):
            code = row["shape_code"]
            out[code] = out.get(code, 0.0) + (row["aggregated_amount"] or 0.0)
    return out


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def cms_medicare():
    """CMS Medicare Geographic Variation PUF 2023, state level: actual FFS payment per
    beneficiary times all beneficiaries (fee-for-service plus Medicare Advantage)."""
    url = ("https://data.cms.gov/data-api/v1/dataset/6219697b-8f6c-4164-bed4-cd9317c58ebc/data"
           "?filter%5BYEAR%5D=2023&filter%5BBENE_GEO_LVL%5D=State&filter%5BBENE_AGE_LVL%5D=All&size=100")
    rows = json.loads(subprocess.run(["curl", "-sS", "-m", "120", url], capture_output=True, text=True).stdout)
    out = {}
    for r in rows:
        pc, n = num(r["TOT_MDCR_PYMT_PC"]), num(r["BENES_TOTAL_CNT"])
        if r["BENE_GEO_DESC"] in PLACES and pc is not None and n is not None:
            out[r["BENE_GEO_DESC"]] = pc * n
    return out, url


def va_gdx():
    """VA Geographic Distribution of VA Expenditures FY2023, total expenditure by state ($000s)."""
    import openpyxl
    import tempfile
    url = "https://www.va.gov/vetdata/docs/GDX/GDX_FY23.xlsx"
    with tempfile.TemporaryDirectory() as d:
        f = Path(d) / "gdx.xlsx"
        subprocess.run(["curl", "-sS", "-m", "120", "-L", "-o", str(f), url], check=True)
        ws = openpyxl.load_workbook(f, data_only=True, read_only=True)["State Level Expenditures"]
        rows = [r for r in ws.iter_rows(min_row=6, values_only=True) if r[0] and r[0].strip() != "Totals" and isinstance(r[2], (int, float))]
    out = {}
    for r in rows:
        if r[0].strip() in STATE_NAMES:
            out[STATE_NAMES[r[0].strip()]] = r[2] * 1000.0
    return out, url


STATE_NAMES = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA", "Colorado": "CO",
    "Connecticut": "CT", "Delaware": "DE", "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA",
    "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO", "Montana": "MT",
    "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
    "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
    "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
    "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY", "Puerto Rico": "PR", "Guam": "GU",
}


def population():
    bea = json.loads((ROOT / "data/research/money/population-2024.json").read_text())["population"]
    dc = json.loads((ROOT / "data/research/federal/defense-contracts-by-state-fy2024.json").read_text())["places"]
    pop, basis = {}, {}
    for p in PLACES:
        if p in FIPS:
            pop[p], basis[p] = bea[FIPS[p] + "000"], "BEA CAINC1 2024"
        else:
            pop[p], basis[p] = dc["US-" + p]["population2024"], "2020 Census"
    return pop, basis


def main():
    pop, basis = population()
    alt = {}
    alt["medicare"] = (cms_medicare(), "CMS Medicare Geographic Variation by National, State and County, 2023, state level: actual payment per fee-for-service beneficiary (TOT_MDCR_PYMT_PC) times all beneficiaries including Medicare Advantage (BENES_TOTAL_CNT); USAspending carries Medicare in only a few places and was not used")
    alt["veterans"] = (va_gdx(), "VA National Center for Veterans Analysis and Statistics, Geographic Distribution of VA Expenditures FY2023, total expenditure by state (compensation and pension, education, insurance, medical care by patient home state, construction, operating); USAspending VA awards miss benefit payments and was not used")
    comps = [(line, i) for line, (_, cs) in LINES.items() if line not in alt for i in range(len(cs))]
    with ThreadPoolExecutor(max_workers=4) as ex:
        results = dict(zip(comps, ex.map(lambda c: fetch(LINES[c[0]][1][c[1]][1]), comps)))
    lines, method = {}, {}
    for line, (desc, cs) in LINES.items():
        if line in alt:
            (res, url), text = alt[line]
            have = [p for p in PLACES if p in res]
            gap = [p for p in PLACES if p not in res]
            natl = sum(res[p] for p in have)
            natl_pop = sum(pop[p] for p in have)
            per = natl / natl_pop
            stake = {"US-" + p: (round((res[p] / pop[p]) / per, 3) if p in res else 1) for p in PLACES}
            lines[line] = {"tag": "SOURCED", "nationalPerResident": round(per, 2), "stake": stake,
                           "estimatedPlaces": gap}
            method[line] = (f"{text}. URL {url}. National ${natl / 1e9:.1f}B over {natl_pop:,} residents of the "
                            f"{len(have)} places the source covers." +
                            (f" ESTIMATED stake 1 (national average) for {', '.join(gap)}: the source does not report them." if gap else ""))
            continue
        dollars = {p: 0.0 for p in PLACES}
        parts = []
        for i, (sign, _, label) in enumerate(cs):
            res = results[(line, i)]
            parts.append(f"{'+' if sign > 0 else '-'} {label} (${sum(res.get(p, 0) for p in PLACES) / 1e9:.1f}B)")
            for p in PLACES:
                dollars[p] += sign * res.get(p, 0.0)
        dollars = {p: max(v, 0.0) for p, v in dollars.items()}
        natl = sum(dollars.values())
        natl_pop = sum(pop.values())
        per = natl / natl_pop
        stake = {"US-" + p: round((dollars[p] / pop[p]) / per, 3) for p in PLACES}
        missing = [p for p in PLACES if dollars[p] == 0]
        note = ""
        if missing:
            note = f" Places with no recorded dollars on this line (stake 0): {', '.join(missing)}."
        lines[line] = {"tag": "SOURCED", "nationalPerResident": round(per, 2), "stake": stake}
        method[line] = (f"USAspending spending_by_geography, place of performance by state, fiscal year 2024, "
                        f"contracts A-D, grants 02-05, direct payments 06 and 10, other 09 and 11. {desc}. "
                        f"Components: {'; '.join(parts)}. National total ${natl / 1e9:.1f}B over "
                        f"{natl_pop:,} residents.{note}")
    lines["netInterest"] = {"tag": "ESTIMATED", "nationalPerResident": None, "stake": {"US-" + p: 1 for p in PLACES}}
    method["netInterest"] = ("No place stake: interest is paid to holders of federal debt, not to a place. Ratio 1 for every place by design.")
    doc = {
        "id": "federal-spending-by-state-fy2024",
        "about": ("How much federal money reaches each of the 56 places per resident, relative to the national per-resident "
                  "amount, for each federal budget line the game uses. 1.0 is the national average. A member of Congress "
                  "weighs their state's stake when voting to raise or cut a line."),
        "retrievedAt": "2026-10-14",
        "stakeDefinition": "(place dollars / place population) / (national dollars / national population), national being the 56 places together, rounded to 3 decimals",
        "caveats": ("Place of performance is where USAspending records the work or payment landing; grants to a state agency land in "
                    "that state, and some contract dollars land at a headquarters rather than where the benefit is felt. Transaction "
                    "obligations in fiscal year 2024, not outlays. Budget-function mapping is by agency and assistance listing, an "
                    "approximation of OMB budget functions, not the Treasury's function table. Loans and insurance are excluded."),
        "method": method,
        "sources": {
            "spending": "USAspending.gov API, POST https://api.usaspending.gov/api/v2/search/spending_by_geography/, scope place_of_performance, geo_layer state, time_period 2023-10-01 to 2024-09-30, read 2026-10-14",
            "populationStates": "BEA Regional Economic Accounts CAINC1 line 2, 2024 population (states and D.C.), via data/research/money/population-2024.json",
            "populationTerritories": "2020 Census counts for PR, GU, VI, AS, MP, via data/research/federal/defense-contracts-by-state-fy2024.json (BEA's table has no territories)",
        },
        "population": {"US-" + p: pop[p] for p in PLACES},
        "populationBasis": {"US-" + p: basis[p] for p in PLACES},
        "lines": lines,
    }
    OUT.write_text(json.dumps(doc, indent=2) + "\n")
    # validate
    d = json.loads(OUT.read_text())
    for name, ln in d["lines"].items():
        assert len(ln["stake"]) == 56, name
        v = sorted(ln["stake"].values())
        print(f"{name:34s} {ln['tag']:9s} min {v[0]:7.3f} med {statistics.median(v):7.3f} max {v[-1]:8.3f}  per-resident {ln['nationalPerResident']}")


if __name__ == "__main__":
    main()
