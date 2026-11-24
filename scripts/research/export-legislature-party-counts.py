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
        seats = collections.defaultdict(lambda: collections.defaultdict(list))
        for row in rows:
            chamber = row["current_chamber"] or "legislature"
            chambers[chamber][row["current_party"] or "Unknown"] += 1
            districts[chamber].add(row["current_district"])
            seats[chamber][row["current_district"]].append(row["current_party"] or "Unknown")
        places[key] = {
            chamber: {
                "members": sum(counts.values()),
                "districts": len(districts[chamber]),
                "parties": dict(counts.most_common()),
                "seatParties": {d: sorted(p) for d, p in sorted(seats[chamber].items())},
            }
            for chamber, counts in sorted(chambers.items())
        }
    congress = {}
    path = os.path.join(folder, "legislators-current.json")
    if os.path.exists(path):
        for person in json.load(open(path)):
            term = person["terms"][-1]
            key = "US-" + term["state"]
            seat = "senate" if term["type"] == "sen" else str(term.get("district", 0))
            congress.setdefault(key, {}).setdefault(seat, []).append(term.get("party", "Unknown"))
        congress = {k: {s: sorted(p) for s, p in sorted(v.items())} for k, v in sorted(congress.items())}
    document = {
        "id": "legislature-party-counts-2026",
        "about": "Sitting members of each state legislative chamber by party, and the party holding each district's seats, from Open States' current roster; the party holding each seat in Congress. Parties only, no names. A chamber's members can be fewer than its seats while seats are vacant.",
        "retrieved": "2026-10-12",
        "source": "https://data.openstates.org/people/current/",
        "license": "Open States data is public domain (CC0).",
        "missing": "Guam, the U.S. Virgin Islands, American Samoa and the Northern Marianas (Open States has no roster for them).",
        "places": places,
        "congressSource": "https://unitedstates.github.io/congress-legislators/legislators-current.json (public domain, CC0)",
        "congress": congress,
    }
    OUT.write_text(json.dumps(document, indent=1) + "\n")
    print(len(places), "jurisdictions")


if __name__ == "__main__":
    main(sys.argv[1])
