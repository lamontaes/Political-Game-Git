"""One-year state population change from the Census Bureau's state population
estimates, for roadmap M1-13 ("other places' populations change within real
ranges"). Writes stateOneYearPopulationChangePct into series/stats.json and
leaves every other key as research.py wrote it.

Usage: python3 -B data/research/regional/population_change.py <raw-dir>
Raw files (www2.census.gov/programs-surveys/popest/datasets/, retrieved
2026-10-25, not kept):
2000-2010/intercensal/state/st-est00int-alldata.csv,
2010-2020/state/totals/nst-est2020-alldata.csv,
2020-2024/state/totals/NST-EST2024-ALLDATA.csv.
Each change is July 1 over July 1 within one vintage, so no change spans the
seam between an intercensal series and the next vintage's base.

The four territories without state estimates (American Samoa, Guam, the
Northern Mariana Islands, the U.S. Virgin Islands) get their own range from
the World Bank's World Development Indicators, total population (SP.POP.TOTL),
2000-2024: raw file wb-territories.json, from
https://api.worldbank.org/v2/country/ASM;GUM;MNP;VIR/indicator/SP.POP.TOTL?format=json&date=2000:2024&per_page=200
(retrieved 2026-10-26, last updated 2026-10-08, not kept). Writes
territoryOneYearPopulationChangePct.
"""
import csv, json, pathlib, sys
import numpy as np

RAW = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(__file__).parent / "series" / "stats.json"
VINTAGES = [
    ("st-est00int-alldata.csv", range(2000, 2011), "intercensal 2000-2010"),
    ("nst-est2020-alldata.csv", range(2010, 2021), "Vintage 2020"),
    ("NST-EST2024-ALLDATA.csv", range(2020, 2025), "Vintage 2024"),
]

changes = []
for name, years, _ in VINTAGES:
    with open(RAW / name, newline="", encoding="latin-1") as f:
        for row in csv.DictReader(f):
            state = row["STATE"]
            # The 50 states and D.C.; totals rows only in the intercensal file.
            if int(state) in (0, 72) or int(state) > 56: continue
            if "SEX" in row and (row["SEX"], row["ORIGIN"], row["RACE"], row["AGEGRP"]) != ("0", "0", "0", "0"): continue
            if "SUMLEV" in row and row["SUMLEV"] != "040": continue
            for y in years:
                if y + 1 not in years: continue
                a, b = float(row[f"POPESTIMATE{y}"]), float(row[f"POPESTIMATE{y + 1}"])
                changes.append((b / a - 1) * 100)

stats = json.loads(OUT.read_text())
stats["stateOneYearPopulationChangePct"] = {
    "p05": float(np.percentile(changes, 5)),
    "p95": float(np.percentile(changes, 95)),
    "n": len(changes),
    "window": "July 1 over July 1, 2000-2024, the 50 states and D.C., within each vintage (Census Bureau intercensal 2000-2010, Vintage 2020, Vintage 2024 state population estimates)",
    "source": "U.S. Census Bureau, Population Estimates Program, state population totals: https://www2.census.gov/programs-surveys/popest/datasets/",
    "tag": "SOURCED",
}
# The territories: each year over the one before, from the World Bank series.
rows = json.loads((RAW / "wb-territories.json").read_text())[1]
by = {}
for row in rows:
    if row["value"] is not None:
        by.setdefault(row["countryiso3code"], {})[int(row["date"])] = row["value"]
territory = [
    (years[y + 1] / years[y] - 1) * 100
    for years in by.values()
    for y in sorted(years)
    if y + 1 in years
]
stats["territoryOneYearPopulationChangePct"] = {
    "p05": float(np.percentile(territory, 5)),
    "p95": float(np.percentile(territory, 95)),
    "n": len(territory),
    "window": "Each year over the one before, 2000-2024, American Samoa, Guam, the Northern Mariana Islands and the U.S. Virgin Islands (World Bank, total population)",
    "source": "World Bank, World Development Indicators, Population, total (SP.POP.TOTL): https://data.worldbank.org/indicator/SP.POP.TOTL, retrieved 2026-10-26",
    "tag": "SOURCED",
}
OUT.write_text(json.dumps(stats, indent=2) + "\n")
print(json.dumps(stats["stateOneYearPopulationChangePct"], indent=1))
print(json.dumps(stats["territoryOneYearPopulationChangePct"], indent=1))
