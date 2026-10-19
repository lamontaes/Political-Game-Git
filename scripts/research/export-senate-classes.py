"""Export each U.S. Senate seat's class and party (no names).

Reads legislators-current.json from the public-domain congress-legislators
project (https://unitedstates.github.io/congress-legislators/, CC0) and writes
data/research/offices/senate-classes-2026.json: for each state, its two seats
by class, the party holding each, and the year the class is next elected
(class 1: 2030, class 2: 2026, class 3: 2028), plus the 2026 special
elections for appointed senators.

Run: python3 scripts/research/export-senate-classes.py <legislators-current.json>
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data/research/offices/senate-classes-2026.json"
NEXT = {1: 2030, 2: 2026, 3: 2028}
# Appointed senators whose seats are on the 2026 ballot as special elections
# (Ballotpedia, "United States Senate special elections, 2026").
SPECIAL_2026 = {("US-OH", 3), ("US-FL", 3)}


def main(path):
    seats = {}
    for person in json.load(open(path)):
        term = person["terms"][-1]
        if term["type"] != "sen":
            continue
        key = "US-" + term["state"]
        cls = term["class"]
        seats.setdefault(key, []).append(
            {
                "class": cls,
                "party": term.get("party", "Unknown"),
                "nextElection": 2026 if (key, cls) in SPECIAL_2026 else NEXT[cls],
                "special": (key, cls) in SPECIAL_2026,
            }
        )
    OUT.write_text(
        json.dumps(
            {
                "id": "senate-classes-2026",
                "about": "Each U.S. Senate seat's class, the party holding it, and the year it is next elected (class 2 in 2026, class 3 in 2028, class 1 in 2030; appointed seats on the 2026 ballot as specials). Parties only, no names.",
                "source": "https://unitedstates.github.io/congress-legislators/legislators-current.json (public domain, CC0); specials from Ballotpedia",
                "retrieved": "2026-10-12",
                "states": {k: sorted(v, key=lambda s: s["class"]) for k, v in sorted(seats.items())},
            },
            indent=1,
        )
        + "\n"
    )
    print(sum(len(v) for v in seats.values()), "seats")


if __name__ == "__main__":
    main(sys.argv[1])
