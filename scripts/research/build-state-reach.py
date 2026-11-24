"""Build src/core2/data/places/state-reach.json: each state's population and the states it borders.

Population: the Census Bureau's state totals file (NST-EST2023-ALLDATA.csv,
ESTIMATESBASE2020 column, the April 2020 census base) for the 50 states, D.C.
and Puerto Rico; for the four island territories, the sum of the territory's
own place rows the game already holds (src/core2/data/places/territory-places.json,
the 2020 Island Areas census).

Borders: two states border each other when a county of one is adjacent to a
county of the other in the Census Bureau's county adjacency file
(county_adjacency.txt). The territories border no state.

Run: python3 scripts/research/build-state-reach.py
"""

import csv
import io
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "src/core2/data/places/state-reach.json"
POP_URL = "https://www2.census.gov/programs-surveys/popest/datasets/2020-2023/state/totals/NST-EST2023-ALLDATA.csv"
ADJ_URL = "https://www2.census.gov/geo/docs/reference/county_adjacency.txt"


def fetch(url):
    with urllib.request.urlopen(url, timeout=90) as r:
        return r.read().decode("latin-1")


def main():
    adj = fetch(ADJ_URL)
    fips_usps = {}
    borders = {}
    current = None
    for line in adj.splitlines():
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        name, geoid, nname, ngeoid = [p.strip().strip('"') for p in parts[:4]]
        if name:
            current = (name, geoid)
        state = re.search(r",\s*([A-Z]{2})$", current[0]).group(1)
        nstate = re.search(r",\s*([A-Z]{2})$", nname).group(1)
        fips_usps[current[1][:2]] = state
        fips_usps[ngeoid[:2]] = nstate
        if state != nstate:
            borders.setdefault(state, set()).add(nstate)
            borders.setdefault(nstate, set()).add(state)
    pop = {}
    for row in csv.DictReader(io.StringIO(fetch(POP_URL))):
        if row["SUMLEV"] != "040":
            continue
        usps = fips_usps.get(row["STATE"].zfill(2))
        if usps:
            pop[usps] = int(row["ESTIMATESBASE2020"])
    territory = json.loads((ROOT / "src/core2/data/places/territory-places.json").read_text())
    for r in territory["rows"]:
        pop[r[2]] = pop.get(r[2], 0) + r[5]
    states = {
        usps: {"population": pop[usps], "borders": sorted(borders.get(usps, []))}
        for usps in sorted(pop)
    }
    total = sum(s["population"] for s in states.values())
    out = {
        "id": "state-reach",
        "about": "Each state's or territory's population and the states it borders: how far a law there reaches, and which readers live next door (the Nation heading on News). Built by scripts/research/build-state-reach.py.",
        "source": {
            "tag": "SOURCED",
            "population": POP_URL + " (ESTIMATESBASE2020, the April 2020 census base; territories: the sum of the territory place rows in territory-places.json, so American Samoa, the Northern Marianas and the Virgin Islands read low where a place is missing)",
            "borders": ADJ_URL + " (a state borders another where one's county is adjacent to the other's)",
        },
        "nationalPopulation": total,
        "states": states,
    }
    OUT.write_text(json.dumps(out, indent=1) + "\n")
    print(len(states), "states", total, "people")


main()
