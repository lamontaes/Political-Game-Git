"""Export the town governments that serve places with no government of their own.

A census-designated place (Bethel, Connecticut; Falmouth's villages in
Massachusetts) has no government of its own. Most are served by their county
(scripts/research/export-acs-place-population.py). In a county area with no
county government, the government that serves the place is the town it lies
in: a New England town, which the Census Bureau's 2025 Government Units
listing carries as a township whose place code is the town's county
subdivision code.

This reads the American Community Survey 2020-2024 five-year table B01003
(total population), downloaded from the Census Bureau's table-based summary
file:

  https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b01003.dat

and writes data/research/money/place-towns-acs-2024.json with, for each place
the Vintage 2025 estimates leave out whose largest county part lies in a
county area with no county government (src/simulation/government-units.generated.ts),
or which lies in a state whose listing holds town or township governments
(New York's towns, New Jersey's and Pennsylvania's townships, the Midwest's
civil townships), where the town or township is the place's local government:
its residents in each county subdivision (summary level 070, largest first),
and each such subdivision's population (summary level 060). The public
budgets read it (src/simulation/public-budgets/opening.ts, servingGovernment),
and so does the town or township a place's local law comes from
(src/simulation/government-units.ts, townshipGovernmentUnitsForPlace).

Run: python3 scripts/research/export-acs-place-towns.py <acsdt5y2024-b01003.dat>
"""

import csv
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
PLACES = ROOT / "data/research/money/place-population-acs-2024.json"
UNITS = ROOT / "src/simulation/government-units.generated.ts"
OUT = ROOT / "data/research/money/place-towns-acs-2024.json"
SOURCE = "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b01003.dat"


def unit_rows() -> list:
    text = UNITS.read_text()
    literal = re.search(r"GOVERNMENT_UNITS_ROWS: string =\s*'(.*)';", text, re.S)
    # A JavaScript single-quoted string: its only escape is the apostrophe.
    return json.loads(literal.group(1).replace("\\'", "'"))


def main() -> None:
    acs = json.loads(PLACES.read_text())
    rows = unit_rows()
    governed = {row[4] for row in rows if row[2] == 1 and row[4]}
    # State FIPS codes of the states whose listing holds town or township
    # governments.
    township_states = {row[4][:2] for row in rows if row[2] == 3 and row[4]}
    places = {
        geoid
        for geoid, parts in acs["placeCounties"].items()
        if parts
        and not geoid.startswith("72")
        and (parts[0][0] not in governed or geoid[:2] in township_states)
    }
    parts: dict[str, list[list]] = {}
    towns: dict[str, int] = {}
    with open(sys.argv[1], newline="") as handle:
        for row in csv.DictReader(handle, delimiter="|"):
            geo = row["GEO_ID"]
            population = int(row["B01003_E001"])
            if geo.startswith("0700000US"):
                # State (2), county (3), county subdivision (5), place (5).
                code = geo[len("0700000US") :]
                place = code[:2] + code[10:]
                if place in places and population > 0:
                    parts.setdefault(place, []).append([code[:10], population])
            elif geo.startswith("0600000US"):
                towns[geo[len("0600000US") :]] = population
    placeTowns = {
        geoid: sorted(parts[geoid], key=lambda part: (-part[1], part[0]))
        for geoid in sorted(parts)
    }
    used = {part[0] for rows in placeTowns.values() for part in rows}
    out = {
        "id": "place-towns-acs-2024",
        "source": SOURCE,
        "table": "B01003 total population, American Community Survey 2020-2024 five-year estimates",
        "scope": "Places the Census Vintage 2025 estimates leave out whose largest county part has no county government, or which lie in a state whose listing holds town or township governments: residents in each county subdivision (summary level 070), and each subdivision's population (summary level 060).",
        "script": "scripts/research/export-acs-place-towns.py",
        "placeTowns": placeTowns,
        "townPopulation": {code: towns[code] for code in sorted(used) if code in towns},
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {len(placeTowns)} places in {len(used)} county subdivisions to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
