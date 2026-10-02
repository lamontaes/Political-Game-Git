"""Normalize published winner records without inferring Census boundary bindings."""
import argparse
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
groups = defaultdict(dict)
for row in csv.DictReader(args.source.open(), delimiter="\t"):
    if int(row["year"]) < 2016 or row["outcome"] != "w" or row["deter"] != "1":
        continue
    if row["uncert"]:
        continue
    identity = tuple(row[key] for key in ("sab", "sen", "dname", "dno", "geopost", "mmdpost", "regime"))
    candidate = tuple(row[key] for key in ("year", "month", "day", "candid"))
    prior = groups[identity].get(candidate)
    if prior:
        if prior["partyCode"] != row["partyt"]:
            raise ValueError("Conflicting party across one candidate's fusion lines")
        prior["caseIds"].append(row["caseid"])
    else:
        groups[identity][candidate] = {
            "date": f'{int(row["year"]):04}-{int(row["month"]):02}-{int(row["day"]):02}',
            "candidateId": row["candid"],
            "partyCode": row["partyt"],
            "partyName": row["party"],
            "caseIds": [row["caseid"]],
            "seatsContested": int(row["eseats"]),
            "districtSeats": int(row["dseats"]),
            "redistrictingCode": row["redist"],
        }
latest = defaultdict(int)
for identity in groups:
    latest[identity[:-1]] = max(latest[identity[:-1]], int(identity[-1]))
records = []
for identity, winners in sorted(groups.items()):
    if int(identity[-1]) != latest[identity[:-1]]:
        continue
    state, senate, name, number, geography_post, member_post, regime = identity
    records.append({
        "key": "|".join(identity),
        "stateUsps": state,
        "chamber": "state-upper" if senate == "1" else "state-lower",
        "districtName": name,
        "districtNumber": number,
        "geographyPost": geography_post,
        "memberPost": member_post,
        "boundaryRegime": int(regime),
        "winners": sorted(winners.values(), key=lambda winner: (winner["date"], winner["candidateId"])),
    })
result = {
    "schemaVersion": 1,
    "source": {
        "citation": "Klarner, Carl, State Legislative Election Returns, 1967–2022, Harvard Dataverse, doi:10.7910/DVN/FJOGJB",
        "url": "https://doi.org/10.7910/DVN/FJOGJB",
        "downloadUrl": "https://dataverse.harvard.edu/api/access/datafile/10273085",
        "codebookUrl": "https://dataverse.harvard.edu/api/access/datafile/10273083",
        "sha256": hashlib.sha256(args.source.read_bytes()).hexdigest(),
        "retrievedAt": "2026-10-02",
        "status": "Published compiled returns; primary certification not independently reverified",
    },
    "selection": "Winning determining-election candidates since 2016; latest recorded boundary regime per source seat; fusion lines deduplicated by candidate and election date; uncertain records excluded",
    "boundaryLimit": "A matching district number does not verify alignment to the 2025 Census identity. Only explicit evidenced bindings may be consumed.",
    "bindings": [],
    "records": records,
}
args.output.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"sourceSeats": len(records), "winnerOptions": sum(len(row["winners"]) for row in records), "verifiedBindings": 0}))
