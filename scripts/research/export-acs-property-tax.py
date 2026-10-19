"""Export effective property tax rates by county and state for law in force.

Reads the American Community Survey 2020-2024 five-year tables B25103 (median
real estate taxes paid, owner-occupied units) and B25077 (median value,
owner-occupied units) from the Census Bureau's table-based summary file:

  https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b25103.dat
  https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b25077.dat

The effective rate is median taxes paid over median value: a survey estimate,
not a statutory rate, so every row is marked as an estimate. The spread is
the state's middle half of county rates (25th to 75th percentile). The ACS
covers the 50 states, D.C. and Puerto Rico; the other four territories are
not in it.

Run: python3 scripts/research/export-acs-property-tax.py <b25103.dat> <b25077.dat>
"""

import json
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data/research/laws/local-starting-law/property-tax-effective.json"
BASE = "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/"
FIPS = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
    "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
    "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
    "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
    "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
    "55": "WI", "56": "WY", "72": "PR",
}


def read(path, column):
    rows = {}
    with open(path) as handle:
        header = handle.readline().strip().split("|")
        index = header.index(column)
        for line in handle:
            cells = line.rstrip("\n").split("|")
            geo = cells[0]
            if not (geo.startswith("0500000US") or geo.startswith("0400000US")):
                continue
            try:
                value = float(cells[index])
            except ValueError:
                continue
            if value > 0:
                rows[geo] = value
    return rows


def main(taxes_path, values_path):
    taxes = read(taxes_path, "B25103_E001")
    values = read(values_path, "B25077_E001")
    counties, states = {}, {}
    for geo, tax in taxes.items():
        value = values.get(geo)
        if not value:
            continue
        code = geo.split("US")[1]
        rate = round(100 * tax / value, 3)
        if geo.startswith("0500000US"):
            if code[:2] in FIPS:
                counties[code] = rate
        elif code in FIPS:
            states["US-" + FIPS[code]] = {
                "rate": rate,
                "medianTaxesPaid": int(tax),
                "medianValue": int(value),
            }
    for key, row in states.items():
        fips = next(f for f, s in FIPS.items() if "US-" + s == key)
        rates = sorted(r for c, r in counties.items() if c[:2] == fips)
        if len(rates) >= 4:
            q = statistics.quantiles(rates, n=4)
            row["spreadLow"], row["spreadHigh"] = round(q[0], 3), round(q[2], 3)
        else:
            row["spreadLow"], row["spreadHigh"] = min(rates), max(rates)
        row["counties"] = len(rates)
    document = {
        "id": "property-tax-effective-acs-2024",
        "unit": "percent of home value per year",
        "series": "property-tax-effective-rate",
        "level": "county",
        "estimate": True,
        "retrieved": "2026-10-12",
        "sources": [BASE + "acsdt5y2024-b25103.dat", BASE + "acsdt5y2024-b25077.dat"],
        "method": "Median real estate taxes paid (B25103) divided by median home value (B25077), owner-occupied units, ACS 2020-2024 five-year. A survey estimate of the combined property tax of every level that taxes the home, not a statutory rate.",
        "script": "scripts/research/export-acs-property-tax.py",
        "notTerritories": ["US-GU", "US-VI", "US-AS", "US-MP"],
        "states": dict(sorted(states.items())),
        "counties": dict(sorted(counties.items())),
    }
    OUT.write_text(json.dumps(document, separators=(",", ":")) + "\n")
    print(len(states), "states,", len(counties), "counties")


if __name__ == "__main__":
    main(*sys.argv[1:3])
