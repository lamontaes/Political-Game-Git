"""Derives src/core2/data/moves/destinations.json from the IRS SOI county
outflow files in data/research/renewal/moves/ (2022-2023 tax years): for each
origin county, the other county its movers most often went to (by individuals,
n2). Where people go when no relative or job names a place.

    python3 -I data/research/renewal/derive-destinations.py
"""
import csv, glob, json, os

root = os.path.dirname(os.path.abspath(__file__))
best = {}
for path in sorted(glob.glob(os.path.join(root, "moves", "roadmap-r9-irs-county-*.csv"))):
    with open(path, newline="") as handle:
        for row in csv.DictReader(handle):
            origin, destination = row["originGeoid"], row["destinationGeoid"]
            if origin == destination or not row["n2"].isdigit():
                continue
            n2 = int(row["n2"])
            if n2 > best.get(origin, ("", -1))[1]:
                best[origin] = (destination, n2)
out = {
    "version": "moves-destinations-v1",
    "source": {
        "tag": "SOURCED",
        "citation": "IRS Statistics of Income county-to-county migration, 2022-2023 tax years (https://www.irs.gov/pub/irs-soi/countyoutflow2223.csv), top pairs per county as kept in data/research/renewal/moves/. Each origin county's most common other destination by individuals (n2). Territories are not in the IRS county files.",
    },
    "topDestinationByCounty": {k: v[0] for k, v in sorted(best.items())},
}
target = os.path.join(root, "..", "..", "..", "src", "core2", "data", "moves", "destinations.json")
with open(target, "w") as handle:
    json.dump(out, handle, indent=2)
    handle.write("\n")
print(len(best), "origin counties")
