"""Export each state legislative chamber's party counts (aggregates, no names).

Reads Open States' current-people CSVs (public domain, CC0):
  https://data.openstates.org/people/current/<state>.csv
and writes data/research/offices/legislature-party-counts-2026.json: for each
jurisdiction and chamber (upper, lower, legislature for unicameral bodies), the
number of sitting members by party. Replaces the Book of the States party
balance, whose terms forbid commercial use.

Run: python3 scripts/research/export-legislature-party-counts.py <folder of <st>.csv>
"""

import collections
import csv
import glob
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data/research/offices/legislature-party-counts-2026.json"


def main(folder):
    places = {}
    for path in sorted(glob.glob(os.path.join(folder, "*.csv"))):
        rows = list(csv.DictReader(open(path)))
        if not rows or "current_chamber" not in rows[0]:
            continue
        key = "US-" + os.path.basename(path)[:-4].upper()
        chambers = collections.defaultdict(collections.Counter)
        districts = collections.defaultdict(set)
        for row in rows:
            chamber = row["current_chamber"] or "legislature"
            chambers[chamber][row["current_party"] or "Unknown"] += 1
            districts[chamber].add(row["current_district"])
        places[key] = {
            chamber: {
                "members": sum(counts.values()),
                "districts": len(districts[chamber]),
                "parties": dict(counts.most_common()),
            }
            for chamber, counts in sorted(chambers.items())
        }
    document = {
        "id": "legislature-party-counts-2026",
        "about": "Sitting members of each state legislative chamber by party, counted from Open States' current roster. Aggregates only. A chamber's members can be fewer than its seats while seats are vacant.",
        "retrieved": "2026-10-12",
        "source": "https://data.openstates.org/people/current/",
        "license": "Open States data is public domain (CC0).",
        "missing": "Guam, the U.S. Virgin Islands, American Samoa and the Northern Marianas (Open States has no roster for them).",
        "places": places,
    }
    OUT.write_text(json.dumps(document, indent=1) + "\n")
    print(len(places), "jurisdictions")


if __name__ == "__main__":
    main(sys.argv[1])
