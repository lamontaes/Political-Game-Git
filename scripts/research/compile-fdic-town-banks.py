"""Compiles the shapes of real small banks for the game's town banks.

Reads the FDIC BankFind call-report extracts for June 30, 2026 that the
Emergence Building Blocks research read on September 28, 2026
(`fin_20260630.json`: CERT, ASSET, DEP, CHBAL, STNAME; `sec_20260630.json`:
CERT, ASSET, DEP, CHBAL, SC, SCPLEDGE, SCHA, FREPO; amounts in thousands of
dollars), and Build 19's of September 29, 2026 (`unins_20260630.json`: CERT,
DEP, DEPUNINS, DEPINS), and writes, for every insured institution under
$1 billion in assets, three ratios to its deposits:

1. cushion: cash and balances due, plus securities not pledged, plus federal
   funds sold and reverse repurchase agreements (CHBAL + SC - SCPLEDGE +
   FREPO) / DEP;
2. other assets, mostly loans: (ASSET - CHBAL - SC - FREPO) / DEP;
3. uninsured: its estimated uninsured deposits, DEPUNINS / DEP.

Writes data/tables/town-bank-shapes.json: FDIC_SMALL_BANK_SHAPES holds, by
state, `cushion,otherAssets,uninsured` per bank joined by `;` in certificate
order; FDIC_SMALL_BANK_RECORDS holds [assets in thousands of dollars,
certificate] in the same row order; FDIC_SMALL_BANK_COUNT and
FDIC_SMALL_BANK_REPORT_DATE say how many banks and which report. The table is
formatted with the repository's Prettier JSON parser.

Usage, from the repository root:
python3 scripts/research/compile-fdic-town-banks.py <folder>
"""

import json
import subprocess
import sys
from collections import defaultdict

folder = sys.argv[1]
fin = {
    row["data"]["CERT"]: row["data"]
    for row in json.load(open(f"{folder}/fin_20260630.json"))["data"]
}
uninsured = {
    row["data"]["CERT"]: row["data"]
    for row in json.load(open(f"{folder}/unins_20260630.json"))["data"]
}
by_state = defaultdict(list)
for row in json.load(open(f"{folder}/sec_20260630.json"))["data"]:
    bank = row["data"]
    named = fin.get(bank["CERT"])
    if not named or not named["STNAME"] or not bank["DEP"]:
        continue
    if bank["ASSET"] >= 1_000_000:
        continue
    cushion = (bank["CHBAL"] + bank["SC"] - bank["SCPLEDGE"] + bank["FREPO"]) / bank["DEP"]
    other = (bank["ASSET"] - bank["CHBAL"] - bank["SC"] - bank["FREPO"]) / bank["DEP"]
    unins = uninsured[bank["CERT"]]["DEPUNINS"] / bank["DEP"]
    by_state[named["STNAME"].title().replace(" Of ", " of ")].append(
        (round(cushion, 3), round(max(0.0, other), 3), round(unins, 3), bank["CERT"], bank["ASSET"])
    )

shapes = {}
records = {}
for state in sorted(by_state):
    rows = sorted(by_state[state], key=lambda row: row[3])
    shapes[state] = ";".join(f"{c:g},{o:g},{u:g}" for c, o, u, _, _ in rows)
    records[state] = [[asset, cert] for _, _, _, cert, asset in rows]
total = sum(len(rows) for rows in by_state.values())
table = {
    "FDIC_SMALL_BANK_COUNT": total,
    "FDIC_SMALL_BANK_RECORDS": records,
    "FDIC_SMALL_BANK_REPORT_DATE": "2026-06-30",
    "FDIC_SMALL_BANK_SHAPES": shapes,
}
formatted = subprocess.run(
    ["node_modules/.bin/prettier", "--parser", "json"],
    input=json.dumps(table, ensure_ascii=False),
    capture_output=True,
    text=True,
    check=True,
).stdout
open("data/tables/town-bank-shapes.json", "w").write(formatted)
print(total, "banks in", len(by_state), "states and territories")
