"""Export BEA's 2024 population for every county, state and D.C. to JSON.

Reads data/source/bea-regional/raw/CAINC1.zip (locked in that folder's
artifact-lock.json), table CAINC1, line code 2 ("Population (persons)"),
and writes data/research/money/population-2024.json keyed by five-digit FIPS:
a county is its county FIPS, a state or D.C. is its state FIPS followed by
"000". BEA combines some Virginia independent cities with their counties
(FIPS 51900-51999); those combined areas are written under BEA's own code
and name. The territories are not in the table and are not written.

Run: python3 scripts/research/export-bea-population-2024.py
"""

import csv
import hashlib
import io
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data/source/bea-regional/raw/CAINC1.zip"
MEMBER = "CAINC1__ALL_AREAS_1969_2024.csv"
EXPECTED_MEMBER_SHA256 = "98c5ef2a2d3f72e482eac5bca0544ce3114375f8908226872b4f429d0e0f2028"
OUT = ROOT / "data/research/money/population-2024.json"
YEAR = "2024"


def main() -> None:
    with zipfile.ZipFile(SOURCE) as archive:
        raw = archive.read(MEMBER)
    digest = hashlib.sha256(raw).hexdigest()
    if digest != EXPECTED_MEMBER_SHA256:
        raise SystemExit(f"{MEMBER} changed: {digest}")
    rows = csv.DictReader(io.StringIO(raw.decode("latin-1")))
    population: dict[str, int] = {}
    for row in rows:
        if (row.get("LineCode") or "").strip() != "2":
            continue
        fips = (row.get("GeoFIPS") or "").strip().strip('"').strip()
        value = (row.get(YEAR) or "").strip()
        if len(fips) != 5 or fips == "00000" or not value.isdigit():
            continue
        population[fips] = int(value)
    out = {
        "id": "population-2024",
        "asOf": "2024-07-01",
        "sourceKind": "official",
        "source": {
            "title": "CAINC1 Personal income summary, line code 2: Population (persons)",
            "publisher": "U.S. Bureau of Economic Analysis, Regional Economic Accounts",
            "file": "data/source/bea-regional/raw/CAINC1.zip",
            "member": MEMBER,
            "memberSha256": EXPECTED_MEMBER_SHA256,
        },
        "scope": "Every county and county equivalent, each state and D.C., by five-digit FIPS; a state is its FIPS followed by 000. Territories are not in the table.",
        "population": dict(sorted(population.items())),
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {len(population)} areas to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
