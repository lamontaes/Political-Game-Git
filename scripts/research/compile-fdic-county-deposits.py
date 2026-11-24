"""Compiles the deposits held in each county's bank branches.

Reads the FDIC Summary of Deposits for June 30, 2026, fetched from the FDIC
BankFind API (https://api.fdic.gov/banks/sod?filters=YEAR:2026, fields
STCNTYBR, DEPSUMBR, CERT, ASSET, BKMO; amounts in thousands of dollars) as
JSON pages in one folder, and writes each county's deposits: the sum of
DEPSUMBR over its branches.

A bank with more than $10 billion in assets books deposits gathered across
the country (online accounts, brokered and sweep deposits) at its main
office, so a main office of such a bank is left out. The $10 billion line
is where federal law treats a bank as large (12 U.S.C. 5515).

Writes data/tables/town-deposits.json, which src/core2/modules/credit.ts
reads: FDIC_COUNTY_DEPOSITS holds "GEOID:deposits" pairs joined by ";", in
thousands of dollars, and FDIC_COUNTY_DEPOSITS_META the source and counts.
The table is formatted with the repository's Prettier JSON parser.

Usage, from the repository root:
python3 scripts/research/compile-fdic-county-deposits.py <folder>
"""

import glob
import json
import subprocess
import sys
from collections import defaultdict

folder = sys.argv[1]
rows = []
for path in sorted(glob.glob(f"{folder}/*.json")):
    rows += [row["data"] for row in json.load(open(path))["data"]]
if len({row["ID"] for row in rows}) != len(rows):
    sys.exit("duplicate branches across pages")

deposits = defaultdict(int)
branches = 0
left_out = 0
for row in rows:
    if row["STCNTYBR"] is None:
        continue
    if row["BKMO"] == 1 and (row["ASSET"] or 0) > 10_000_000:
        left_out += 1
        continue
    deposits[f"{int(row['STCNTYBR']):05d}"] += row["DEPSUMBR"] or 0
    branches += 1

table = {
    "FDIC_COUNTY_DEPOSITS": ";".join(f"{k}:{deposits[k]}" for k in sorted(deposits)),
    "FDIC_COUNTY_DEPOSITS_META": {
        "source": "https://api.fdic.gov/banks/sod?filters=YEAR:2026",
        "asOf": "2026-06-30",
        "branches": branches,
        "largeBankMainOfficesLeftOut": left_out,
        "counties": len(deposits),
    },
}
formatted = subprocess.run(
    ["node_modules/.bin/prettier", "--parser", "json"],
    input=json.dumps(table, ensure_ascii=False),
    capture_output=True,
    text=True,
    check=True,
).stdout
open("data/tables/town-deposits.json", "w").write(formatted)
print(f"{len(deposits)} counties, {branches} branches, {left_out} main offices left out")
