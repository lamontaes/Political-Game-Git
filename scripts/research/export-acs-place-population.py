"""Export ACS populations for the places the Census 2025 estimates leave out.

The game's town populations come from the Census Bureau's Vintage 2025
estimates (src/simulation/nationwide-world/place-population.ts), which cover
incorporated places in the 50 states and D.C. only. Census-designated places
(Bear, Delaware; Urban Honolulu) and every place in Puerto Rico have none, so
a budget for one of those towns had no population to scale by.

This reads the American Community Survey 2020-2024 five-year table B01003
(total population), downloaded from the Census Bureau's table-based summary
file:

  https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b01003.dat

and writes data/research/money/place-population-acs-2024.json with each place
(summary level 160) the Vintage 2025 file does not hold. The public budgets
read it only where the Vintage 2025 figure is missing
(src/simulation/public-budgets/opening.ts).

Run: python3 scripts/research/export-acs-place-population.py <acsdt5y2024-b01003.dat>
"""

import csv
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
VINTAGE_2025 = (
    ROOT
    / "docs/research/chatgpt-answers/2026-09-23-cto-handoff-2230"
    / "DATA-Census-Vintage-2025-places-50-states-DC.csv"
)
OUT = ROOT / "data/research/money/place-population-acs-2024.json"
SOURCE = "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b01003.dat"


def main() -> None:
    with VINTAGE_2025.open(newline="") as handle:
        # The game reads only the estimates universe; Urban Honolulu, the one
        # CDP the file carries as an exception, is left out of it
        # (scripts/world/compile-place-population.ts).
        covered = {
            row["geoid7"]
            for row in csv.DictReader(handle)
            if row["geography_type"] == "Census estimates-universe place"
        }
    places = {}
    with open(sys.argv[1], newline="") as handle:
        for row in csv.DictReader(handle, delimiter="|"):
            geo = row["GEO_ID"]
            if not geo.startswith("1600000US"):
                continue
            geoid = geo[len("1600000US") :]
            if geoid in covered:
                continue
            places[geoid] = int(row["B01003_E001"])
    out = {
        "id": "place-population-acs-2024",
        "source": SOURCE,
        "table": "B01003 total population, American Community Survey 2020-2024 five-year estimates",
        "scope": "Places (summary level 160) that the Census Vintage 2025 place estimates do not cover: census-designated places and Puerto Rico.",
        "script": "scripts/research/export-acs-place-population.py",
        "places": dict(sorted(places.items())),
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {len(places)} places to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
