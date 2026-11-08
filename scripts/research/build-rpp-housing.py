"""Writes src/core2/data/regional/rpp-housing.json from BEA's SARPP table (Regional Price Parities by state).

Source: U.S. Bureau of Economic Analysis, Regional Price Parities by State, SARPP,
https://apps.bea.gov/regional/zip/SARPP.zip (fetched 2026-11-08; statistics for 2024).
The component weights of the all-items index are estimated by least squares of the
all-items index on its four components across the 51 states (goods, housing,
utilities, other services); BEA publishes the components, not the weights.

  python3 scripts/research/build-rpp-housing.py path/to/SARPP_STATE_2008_2024.csv
"""
import csv
import json
import sys

import numpy as np

rows = {}
for r in csv.reader(open(sys.argv[1]), skipinitialspace=True):
    g = r[0].strip().strip('"')
    if not g.isdigit() or g == "00000" or len(r) < 10:
        continue
    try:
        rows.setdefault(g, {})[int(r[4])] = float(r[-1])
    except ValueError:
        pass
states = {g: d for g, d in rows.items() if all(k in d for k in (1, 2, 3, 4, 5))}
X = np.array([[d[2], d[3], d[4], d[5]] for d in states.values()])
y = np.array([d[1] for d in states.values()])
w = np.linalg.lstsq(X, y, rcond=None)[0]
out = {
    "source": "U.S. Bureau of Economic Analysis, Regional Price Parities by State (SARPP), 2024, https://apps.bea.gov/regional/zip/SARPP.zip, fetched 2026-11-08.",
    "year": 2024,
    "housingWeight": round(float(w[1] / w.sum()), 4),
    "weightsFrom": "Least squares of the all-items index on goods, housing, utilities and other services across the 51 states, normalized to sum to one; the largest gap between fitted and published all-items is "
    + str(round(float(np.abs(X @ w - y).max()), 2))
    + " index points.",
    "byFips": {
        g[:2]: {"allItems": d[1], "housing": d[3]} for g, d in sorted(states.items())
    },
}
json.dump(out, open("src/core2/data/regional/rpp-housing.json", "w"), indent=2, ensure_ascii=False)
open("src/core2/data/regional/rpp-housing.json", "a").write("\n")
print(out["housingWeight"], len(out["byFips"]))
