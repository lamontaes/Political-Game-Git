"""EPA Green Book county nonattainment history (phistory.dbf, export of 2026-09-30) to core2 data.

Each county (five-digit FIPS) lists the standards it was in nonattainment for,
as runs of years [first, last, extent], whole ("W") or part ("P") of the county. Revoked standards
are kept and flagged: a revoked standard's area can still owe its plan.

    python3 -I data/research/environment/build_nonattainment.py
"""
import json
import struct
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "greenbook-phistory-2026-09-30.dbf"
OUT = HERE.parents[2] / "src" / "core2" / "data" / "business" / "nonattainment.json"


def read_dbf(path):
    data = path.read_bytes()
    count, header, record = struct.unpack("<IHH", data[4:12])
    fields, at = [], 32
    while data[at] != 0x0D:
        name = data[at : at + 11].split(b"\0")[0].decode()
        fields.append((name, data[at + 16]))
        at += 32
    rows = []
    for i in range(count):
        start = header + i * record
        raw = data[start : start + record]
        if raw[:1] == b"*":
            continue
        row, pos = {}, 1
        for name, length in fields:
            row[name] = raw[pos : pos + length].decode("latin-1").strip()
            pos += length
        rows.append(row)
    return rows


def main():
    rows = read_dbf(SOURCE)
    counties = {}
    for row in rows:
        fips = row["FIPS_STATE"] + row["FIPS_CNTY"]
        years = {
            int(key[3:]): value
            for key, value in row.items()
            if key.startswith("PW_") and value in ("P", "W")
        }
        if not years:
            continue
        entry = counties.setdefault(fips, {"name": row["COUNTYNAME"], "state": row["ST_ABBR"], "standards": []})
        # Runs of consecutive years with the same extent: [first, last, "W" or "P"].
        runs = []
        for year, extent in sorted(years.items()):
            if runs and runs[-1][1] == year - 1 and runs[-1][2] == extent:
                runs[-1][1] = year
            else:
                runs.append([year, year, extent])
        entry["standards"].append({"standard": row["POLLUTANT"], "revoked": bool(row["REVOKED_NA"]), "runs": runs})
    out = {
        "source": {
            "tag": "SOURCED",
            "asOf": "2026-09-30",
            "citation": "U.S. EPA Green Book, nonattainment areas by county and year, 1992-2026 (phistory, exported 2026-09-30): https://www.epa.gov/green-book/green-book-data-download",
        },
        "counties": dict(sorted(counties.items())),
    }
    OUT.write_text(json.dumps(out, separators=(",", ":")) + "\n")
    current = sum(
        1
        for c in counties.values()
        if any(not s["revoked"] and any(a <= 2026 <= b for a, b, _ in s["runs"]) for s in c["standards"])
    )
    print(len(counties), "counties ever listed;", current, "in nonattainment for a current standard in 2026")


if __name__ == "__main__":
    main()
