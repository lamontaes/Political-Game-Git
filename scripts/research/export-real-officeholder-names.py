"""Export one-way hashes of real current officeholders' full names.

The game must never give a generated official the full name of a real
officeholder. This file lets a test and the officials generator check a name
without the repository or the game carrying the names themselves: each name is
normalized (lowercase letters only, given name + family name) and stored as the
first 16 hex digits of its SHA-256.

Sources (both public domain, CC0):
  https://unitedstates.github.io/congress-legislators/legislators-current.json
  https://data.openstates.org/people/current/<state>.csv  (Open States)

Run: python3 scripts/research/export-real-officeholder-names.py <folder with legislators-current.json and <st>.csv files>
"""

import csv
import glob
import hashlib
import json
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data/research/offices/real-officeholder-name-hashes.json"


def normalize(given, family):
    text = f"{given} {family}".lower()
    return " ".join(re.sub(r"[^a-z ]", "", text).split())


def digest(name):
    return hashlib.sha256(name.encode()).hexdigest()[:16]


def main(folder):
    names = set()
    for person in json.load(open(os.path.join(folder, "legislators-current.json"))):
        name = person["name"]
        names.add(normalize(name["first"], name["last"]))
        if name.get("nickname"):
            names.add(normalize(name["nickname"], name["last"]))
    states = 0
    for path in sorted(glob.glob(os.path.join(folder, "*.csv"))):
        rows = list(csv.DictReader(open(path)))
        if not rows or "given_name" not in rows[0]:
            continue
        states += 1
        for row in rows:
            if row["given_name"] and row["family_name"]:
                names.add(normalize(row["given_name"], row["family_name"]))
    document = {
        "id": "real-officeholder-name-hashes",
        "about": "SHA-256 (first 16 hex digits) of each real current officeholder's normalized full name: lowercase letters, given name then family name, single spaces. For checking generated officials only; never shown.",
        "retrieved": "2026-10-12",
        "sources": [
            "https://unitedstates.github.io/congress-legislators/legislators-current.json",
            "https://data.openstates.org/people/current/",
        ],
        "license": "Both sources are public domain (CC0).",
        "coverage": f"Congress (all current members) and current state legislators in {states} jurisdictions from Open States. Governors and other statewide officers are not yet included.",
        "hashes": sorted(digest(n) for n in names),
    }
    OUT.write_text(json.dumps(document, indent=0) + "\n")
    print(len(names), "names from", states, "legislatures")


if __name__ == "__main__":
    main(sys.argv[1])
