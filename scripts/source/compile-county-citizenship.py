"""Compile Census ACS citizenship counts; never an individual legal determination."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PREFIX = ROOT / "data/source/acs-county-citizenship"
OUTPUT = ROOT / "src/simulation/county-citizenship.generated.json"
BASE = "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/"


def compile_rows(raw, table):
    lines = raw.decode("utf-8-sig").splitlines()
    expected = ["GEO_ID"]
    for column in range(1, 7):
        expected += [f"{table}_E{column:03}", f"{table}_M{column:03}"]
    if lines[0].split("|") != expected:
        raise ValueError(f"Unexpected {table} columns")
    rows = {}
    for number, line in enumerate(lines[1:], 2):
        if not line.startswith("0500000US"):
            continue
        cells = line.split("|")
        if len(cells) != len(expected):
            raise ValueError(f"Malformed {table} county row {number}")
        county = cells[0][9:]
        if len(county) != 5 or not county.isdigit() or county in rows:
            raise ValueError(f"Invalid or duplicated county at {number}")
        counts = [int(value) for value in cells[1::2]]
        if any(value < 0 for value in counts) or sum(counts[1:]) != counts[0]:
            raise ValueError(f"Missing or inconsistent counts at {number}")
        rows[county] = {
            "total": counts[0],
            "citizenByBirth": sum(counts[1:4]),
            "naturalizedCitizen": counts[4],
            "noncitizen": counts[5],
            "sourceTable": table,
            "sourceLine": number,
            "estimates": counts,
            "marginsOfError": [int(value) for value in cells[2::2]],
        }
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rows, artifacts = {}, []
    for table, expected_count in [("B05001", 3144), ("B05001PR", 78)]:
        name = f"acsdt5y2024-{table.lower()}.dat"
        path = PREFIX / "raw" / (name + ".gz")
        if args.check:
            compressed = path.read_bytes()
            raw = gzip.decompress(compressed)
        else:
            raw = (PREFIX / "raw" / name).read_bytes()
            compressed = gzip.compress(raw, mtime=0)
            path.write_bytes(compressed)
        table_rows = compile_rows(raw, table)
        if len(table_rows) != expected_count or rows.keys() & table_rows.keys():
            raise ValueError(f"Unexpected {table} county coverage")
        rows.update(table_rows)
        artifacts.append({
            "url": BASE + name,
            "localPath": str(path.relative_to(ROOT)),
            "rawBytes": len(raw),
            "rawSha256": hashlib.sha256(raw).hexdigest(),
            "storedBytes": len(compressed),
            "storedSha256": hashlib.sha256(compressed).hexdigest(),
        })
    output = {
        "format": "ocd-county-citizenship/v1",
        "vintage": "2020-2024 ACS 5-year",
        "observedAt": "2026-10-06",
        "interpretation": "Starting-world population estimates, not individual legal evidence or historical applicability.",
        "uncoveredJurisdictions": "Island areas outside Puerto Rico use an explicitly marked estimate from published county shares.",
        "artifacts": artifacts,
        "counties": dict(sorted(rows.items())),
    }
    encoded = json.dumps(output, indent=2) + "\n"
    if args.check:
        if json.loads(OUTPUT.read_text()) != output:
            raise ValueError("Generated citizenship corpus differs from locked inputs")
    else:
        OUTPUT.write_text(encoded)
    print(f"{len(rows)} county rows; source hashes and citizen totals verified")


if __name__ == "__main__":
    main()
