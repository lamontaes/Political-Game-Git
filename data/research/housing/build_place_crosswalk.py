"""Connecticut places to their current planning region (the ACS's county level since 2022).

A place takes the planning region of the town (county subdivision) with its
own name, from the ACS 2023 5-year geography file; places inside a town of
another name are left out (the housing engine then uses the state's figures).
Writes src/core2/data/housing/place-county-crosswalk.json.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
GEOS = ROOT / "data/source/cbsa-delineations/raw/acs-2023-geos-5yr.txt"
OUT = ROOT / "src/core2/data/housing/place-county-crosswalk.json"
SUFFIX = re.compile(r" (city|town|borough|CDP|village)$")

towns = {}
places = []
with GEOS.open(encoding="utf-8-sig") as handle:
    header = handle.readline().rstrip("\n").split("|")
    col = {name: i for i, name in enumerate(header)}
    for line in handle:
        row = line.rstrip("\n").split("|")
        if row[col["STUSAB"]] != "CT" or row[col["COMPONENT"]] != "00":
            continue
        name = row[col["NAME"]].split(",")[0]
        if row[col["SUMLEVEL"]] == "060":
            towns[SUFFIX.sub("", name)] = row[col["STATE"]] + row[col["COUNTY"]]
        elif row[col["SUMLEVEL"]] == "160":
            places.append((row[col["STATE"]] + row[col["PLACE"]], SUFFIX.sub("", name)))

crosswalk = {geoid: towns[name] for geoid, name in sorted(places) if name in towns}
OUT.write_text(json.dumps({
    "version": "place-county-crosswalk-v1",
    "source": {
        "tag": "SOURCED",
        "asOf": "2026-10-13",
        "citation": "Census Bureau, ACS 2023 5-year geography file (data/source/cbsa-delineations/raw/acs-2023-geos-5yr.txt): Connecticut towns (summary level 060) in their planning regions, matched to places (160) of the same name.",
    },
    "places": crosswalk,
}, indent=2) + "\n")
print(len(crosswalk), "of", len(places), "Connecticut places")
