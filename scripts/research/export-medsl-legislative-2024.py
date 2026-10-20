#!/usr/bin/env python3
"""Sum the 2024 general-election state legislative vote by district.

Reads MIT Election Data and Science Lab, "State Precinct-Level Returns 2024"
(Harvard Dataverse doi:10.7910/DVN/DODOBJ, STATE_precinct_general.csv) and
writes data/research/elections/medsl-2024-legislative-district-results.json:
for each state, chamber and district label as the source prints it, the
Democratic, Republican and other votes. Special elections, write-ins counted
as candidates by the source, and redacted ("*") precinct counts are left out.

Run: python3 -I scripts/research/export-medsl-legislative-2024.py <csv> <out>
The reader is src/core2/legislative-district-results.ts.
"""
import csv
import json
import sys
from collections import defaultdict

SKIP = {"OVERVOTES", "UNDERVOTES", "REGISTERED VOTERS", "TOTAL VOTES", "BALLOTS CAST"}
CHAMBER = {"STATE HOUSE": "lower", "STATE SENATE": "upper"}


def main(src: str, out: str) -> None:
    totals = defaultdict(lambda: [0, 0, 0])
    redacted = 0
    csv.field_size_limit(1 << 24)
    with open(src, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            chamber = CHAMBER.get(row["office"])
            if not chamber or row["stage"] != "GEN" or row["year"] != "2024":
                continue
            if row["special"] == "TRUE" or not row["candidate"] or row["candidate"] in SKIP:
                continue
            try:
                votes = int(float(row["votes"]))
            except ValueError:
                redacted += 1
                continue
            party = row["party_simplified"]
            slot = 0 if party == "DEMOCRAT" else 1 if party == "REPUBLICAN" else 2
            totals[(row["state_po"], chamber, row["district"])][slot] += votes
    rows = [
        [usps, chamber, district, dem, rep, other]
        for (usps, chamber, district), (dem, rep, other) in sorted(totals.items())
    ]
    doc = {
        "id": "medsl-2024-legislative-district-results",
        "publisher": "MIT Election Data and Science Lab",
        "vintage": "2024 general election",
        "table": "State Precinct-Level Returns 2024 (STATE_precinct_general.csv), offices STATE HOUSE and STATE SENATE",
        "title": "State legislative general-election votes by district, 2024",
        "universe": "Votes cast for each candidate in the November 2024 general election for a state house or senate seat, summed over precincts and voting modes",
        "geography": "State legislative districts, as the source labels them (43 states)",
        "sourceUrl": "https://doi.org/10.7910/DVN/DODOBJ",
        "retrievedOn": "2026-10-20",
        "limits": "No file for AL, LA, MD, MS, NJ, VA, WA, D.C. or the territories (no 2024 returns in the source, or no 2024 legislative election). Labels differ by state and a few are blank; the reader matches them to the Census district names and drops the rest. Votes are summed across a multimember district's seats. Redacted precinct counts are left out. Nebraska's legislature is nonpartisan, so its rows carry only \"other\" votes. A seat one party did not contest has a zero for the missing party.",
        "columns": ["usps", "chamber", "district", "democratic", "republican", "other"],
        "redactedPrecinctCounts": redacted,
        "rows": rows,
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump(doc, f, separators=(",", ":"))
        f.write("\n")
    print(len(rows), "district rows;", redacted, "redacted precinct counts")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
