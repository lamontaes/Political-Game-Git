"""Write the federal debt's lender groups and their shares from the Treasury's
own ownership table.

Reads data/source/treasury-ofs2/ofs2-2026-03-31.json (Treasury Bulletin table
OFS-2, "Estimated Ownership of U.S. Treasury Securities", for the quarter
ending 2026-03-31, and Debt to the Penny for the same day, both as the Fiscal
Data API returned them) and rewrites the `holders` and `shareSource` of
src/core2/data/budgets/federal-debt.json. OFS-2 counts the Federal Reserve
together with the government's own accounts; the intragovernmental holdings
from Debt to the Penny come out of that row, leaving the Federal Reserve's own
holding, so the groups add up to debt held by the public.

Run: python3 scripts/research/export-federal-debt-shares.py
"""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "data/source/treasury-ofs2/ofs2-2026-03-31.json"
OUT = ROOT / "src/core2/data/budgets/federal-debt.json"

# id, display name, the OFS-2 rows that make it up.
GROUPS = [
    ("foreign", "Foreign and international holders", ["Foreign And International"]),
    ("federal-reserve", "The Federal Reserve", None),
    ("mutual-funds", "Mutual funds and money market funds", ["Mutual Funds"]),
    ("pension-funds-private", "Private pension funds", ["Pension Funds - Private"]),
    (
        "pension-funds-state-local",
        "State and local government pension funds",
        ["Pension Funds - State And Local Governments"],
    ),
    ("banks", "Banks and other depository institutions", ["Depository Institutions"]),
    ("savings-bonds", "Households holding savings bonds", ["U.S. Savings Bonds"]),
    ("state-local", "State and local governments", ["State And Local Governments"]),
    ("insurers", "Insurance companies", ["Insurance Companies"]),
    (
        "other",
        "Other investors: households' marketable holdings, brokers, hedge funds and businesses",
        ["Other Investors"],
    ),
]


def main() -> None:
    snap = json.loads(SNAPSHOT.read_text())
    amounts = {r["securities_owner"]: float(r["securities_bil_amt"]) for r in snap["ofs2"]}
    penny = snap["debtToThePenny"]
    intragov = float(penny["intragov_hold_amt"]) / 1e9
    held_by_public = float(penny["debt_held_public_amt"]) / 1e9
    billions = {}
    for gid, _, rows in GROUPS:
        billions[gid] = (
            amounts["Federal Reserve And Government Accounts"] - intragov
            if rows is None
            else sum(amounts[r] for r in rows)
        )
    total = sum(billions.values())
    shares = {g: round(v / total, 6) for g, v in billions.items()}
    # Rounding leaves a few millionths over or under one; the largest holder absorbs it.
    largest = max(shares, key=shares.get)
    shares[largest] = round(shares[largest] + (1 - sum(shares.values())), 6)

    data = json.loads(OUT.read_text())
    data["holders"] = [
        {
            "id": gid,
            "name": name,
            "share": shares[gid],
            "amountBillions": round(billions[gid], 1),
        }
        for gid, name, _ in GROUPS
    ]
    data["shareSource"] = {
        "tag": "SOURCED",
        "source": "U.S. Treasury Bulletin, table OFS-2, Estimated Ownership of U.S. Treasury Securities, quarter ending 2026-03-31, read from the Treasury's Fiscal Data API on 2026-10-15; the Federal Reserve's holding is the table's 'Federal Reserve and Government Accounts' row less the intragovernmental holdings in Debt to the Penny for 2026-03-31.",
        "file": "data/source/treasury-ofs2/ofs2-2026-03-31.json",
        "check": f"The groups add up to {total:.1f} billion dollars against {held_by_public:.1f} billion held by the public on the same day (a difference of {total - held_by_public:.2f} billion, from the table's rounding).",
        "note": "OFS-2 does not split households from other investors: savings bonds are the only household row, and the rest of the households' marketable holdings sit in 'other'. The shares are the quarter's, applied to the opening balance dated by balanceAsOf; they move a point or two a quarter.",
    }
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
