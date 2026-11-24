"""Census 2024 building permits by state and the national construction research to core2 data.

    python3 -I data/research/housing/build_construction.py
"""
import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[2] / "src" / "core2" / "data" / "housing" / "construction.json"
USPS = {"01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY","72":"PR"}


def main():
    pop = {}
    with open(HERE / "census-popest-state-2024.csv", encoding="latin-1") as f:
        for row in csv.DictReader(f):
            if row["SUMLEV"] == "040":
                pop[row["STATE"]] = int(row["POPESTIMATE2024"])
    states = {}
    for line in (HERE / "census-bps-state-2024.txt").read_text().splitlines():
        cells = line.split(",")
        if not cells[0].strip().startswith("2024") or len(cells) < 18:
            continue
        fips = cells[1].strip()
        if fips not in USPS or fips not in pop:
            continue
        single = int(cells[6])
        multi = int(cells[9]) + int(cells[12]) + int(cells[15])
        per = 1000 / pop[fips]
        states[USPS[fips]] = {"singlePerThousand": round(single * per, 3), "multiPerThousand": round(multi * per, 3)}
    research = json.loads((HERE / "construction-2026.json").read_text())["items"]
    v = lambda key: research[key]["value"]
    total_single = sum(s["singlePerThousand"] * pop[f] for f, u in USPS.items() if u in states for s in [states[u]])
    total_multi = sum(s["multiPerThousand"] * pop[f] for f, u in USPS.items() if u in states for s in [states[u]])
    people = sum(pop[f] for f, u in USPS.items() if u in states)
    out = {
        "source": {
            "tag": "SOURCED",
            "asOf": "2026-10-12",
            "citation": "Census Building Permits Survey 2024 by state (st2024a) over Vintage 2024 population; Census Survey of Construction 2024 (time to complete, new home prices); NAHB 2024 cost shares; CBRE Q4 2024 cap rates; Census HVS 2024 vacancy; Lincoln Institute inclusionary programs; New Buildings Institute 2022; National Zoning Atlas and NYT 2019. Gathered in data/research/housing/construction-2026.json.",
        },
        "national": {"singlePerThousand": round(total_single / people, 3), "multiPerThousand": round(total_multi / people, 3)},
        "byState": states,
        "single": {"constructionCostShare": v("sf.constructionCostShare"), "lotShare": v("sf.lotShare"), "monthsToComplete": v("sf.monthsToComplete"), "allElectricCostChange": v("electric.costChangePct")},
        "multi": {"costPerUnitMinor": v("mf.costPerUnit") * 100, "landShare": v("mf.landShare"), "capRate": v("mf.capRate"), "monthsToComplete": v("mf.monthsToComplete"), "allElectricCostChange": v("electric.costChangePct")},
        "zoning": {"singleFamilyOnlyShare": v("zoning.singleFamilyOnlyShare"), "upzoningPermitEffect": v("zoning.upzoningPermitEffect")},
        "vacancy": {"rental": v("vacancy.rental"), "natural": v("vacancy.naturalRate")},
        "inclusionary": {"setAsideShare": v("inclusionary.setAsideShare"), "amiShare": v("inclusionary.amiShare"), "rentShareOfIncome": v("inclusionary.rentShareOfIncome")},
        "farmland": {"developmentShare": v("farmland.developmentShare")},
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(len(states), "places", out["national"])


if __name__ == "__main__":
    main()
