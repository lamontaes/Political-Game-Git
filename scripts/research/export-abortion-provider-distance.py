"""Export each state's driving distance to the nearest abortion provider.

Reads Caitlin Myers' county-by-month travel distances (Vintage July 1, 2026,
osf.io/pfxq3), downloaded from

  https://osf.io/download/gtpm4/

and, for Alaska and Hawaii, whose women-aged-15-44 count the Myers file
leaves blank, the Census Bureau's county population estimates (Vintage 2024),

  https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/counties/totals/co-est2024-alldata.csv

and rewrites the computed figures in
data/research/people/abortion-provider-distance.json: for each state and
D.C., May 2022 (milesBefore) and July 2026 (milesNow), the mean of
distance_origintodest over the state's counties weighted by
origin_population (women aged 15-44), with low and high the weighted 10th and
90th percentiles; Alaska and Hawaii weighted by POPESTIMATE2024; and the
national May 2022 figure over every county with a weight. A county with no
weight in either file (Alaska's former Valdez-Cordova, 02261) is left out.
The places the Myers file does not cover keep their own rows.

Each input is checked against the sha256 recorded in the output, so a rerun
on the same files gives the same figures.

Run: python3 scripts/research/export-abortion-provider-distance.py <myers.csv> <co-est2024-alldata.csv>
"""

import csv
import hashlib
import json
import sys
from pathlib import Path

OUT = Path("data/research/people/abortion-provider-distance.json")
MYERS_SHA256 = "0394cd762e53418b23e32d031c47f141aa8902c1359e5798d2a15859ef5ebbf7"
CENSUS_SHA256 = "abcc8720d669e793bbfdcd440eeec37a78db3b452adbe4ccd1eadf7c72b522b9"
MONTHS = {(2022, 5): "milesBefore", (2026, 7): "milesNow"}
CENSUS_WEIGHTED = {"AK", "HI"}


def sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def weighted(pairs: list[tuple[float, float]]) -> dict:
    pairs = sorted(pairs)
    total = sum(w for _, w in pairs)

    def quantile(q: float) -> float:
        seen = 0.0
        for distance, weight in pairs:
            seen += weight
            if seen >= q * total:
                return distance
        return pairs[-1][0]

    return {
        "miles": round(sum(d * w for d, w in pairs) / total, 1),
        "low": round(quantile(0.1), 1),
        "high": round(quantile(0.9), 1),
    }


def main(myers: str, census: str) -> None:
    for path, want in ((myers, MYERS_SHA256), (census, CENSUS_SHA256)):
        got = sha256(path)
        if got != want:
            sys.exit(f"{path}: sha256 {got}, expected {want}")
    county_population = {}
    with open(census, newline="", encoding="latin-1") as f:
        for row in csv.DictReader(f):
            if row["SUMLEV"] == "050":
                county_population[row["STATE"] + row["COUNTY"]] = int(
                    row["POPESTIMATE2024"]
                )
    by_state: dict[tuple[str, str], list[tuple[float, float]]] = {}
    national: list[tuple[float, float]] = []
    with open(myers, newline="") as f:
        for row in csv.DictReader(f):
            column = MONTHS.get((int(row["year"]), int(row["month"])))
            if not column:
                continue
            state = row["origin_state"]
            if state in CENSUS_WEIGHTED:
                weight = county_population.get(row["origin_fips_code"])
            else:
                weight = float(row["origin_population"]) if row["origin_population"] else None
            if not weight:
                continue
            pair = (float(row["distance_origintodest"]), float(weight))
            by_state.setdefault((state, column), []).append(pair)
            if column == "milesBefore":
                national.append(pair)
    data = json.loads(OUT.read_text())
    data["nationalBefore"] = weighted(national)
    data["inputs"] = [
        {"url": data["source"]["download"], "sha256": MYERS_SHA256},
        {
            "url": "https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/counties/totals/co-est2024-alldata.csv",
            "sha256": CENSUS_SHA256,
        },
    ]
    for (state, column), pairs in sorted(by_state.items()):
        row = data["places"][f"US-{state}"]
        row[column] = weighted(pairs)
        row["tag"] = "ESTIMATED"
        weights = (
            "county population (Census Bureau Vintage 2024 estimates)"
            if state in CENSUS_WEIGHTED
            else "women aged 15-44 (the file's origin_population)"
        )
        row["estimatedFrom"] = (
            "Computed by scripts/research/export-abortion-provider-distance.py from the "
            "Myers county file: the mean of distance_origintodest over the state's "
            f"counties weighted by {weights}, for May 2022 and July 2026."
        )
        row["spread"] = "low and high are the weighted 10th and 90th percentiles of the state's counties"
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
