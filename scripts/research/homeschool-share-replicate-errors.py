"""Replicate-weight standard errors for the Household Pulse homeschool share.

Reads the 2023 weeks 53-63 public-use zips (puf and replicate-weight files)
from a directory given as the first argument, rebuilds each state's share the
way data/research/people/census-household-pulse-homeschool-share-2023.json
does (household weight HWEIGHT on children enrolled in public school, private
school and homeschool), and takes the variance over the 80 replicate weights
with the survey's successive-difference factor 4/80. Writes JSON to the second
argument. Run with python3 -I.
"""
import json
import sys
import zipfile
import numpy as np
import pandas as pd

src, out = sys.argv[1], sys.argv[2]
KIDS = ["TENROLLPUB", "TENROLLPRV", "TENROLLHMSCH"]
num = {}  # state -> array of 81 (full, rep1..80) sums of w*homeschool
den = {}
for week in range(53, 64):
    with zipfile.ZipFile(f"{src}/w{week}.zip") as z:
        names = z.namelist()
        puf = next(n for n in names if n.endswith(f"puf_{week}.csv") and "repwgt" not in n)
        rep = next(n for n in names if "repwgt_puf" in n)
        a = pd.read_csv(z.open(puf), usecols=["SCRAM", "EST_ST", "HWEIGHT"] + KIDS)
        b = pd.read_csv(z.open(rep), usecols=["SCRAM"] + [f"HWEIGHT{i}" for i in range(1, 81)])
    d = a.merge(b, on="SCRAM")
    for c in KIDS:
        d[c] = d[c].where(d[c] >= 0, 0)
    kids = d[KIDS].sum(axis=1)
    home = d["TENROLLHMSCH"]
    weights = d[["HWEIGHT"] + [f"HWEIGHT{i}" for i in range(1, 81)]].to_numpy()
    for st, idx in d.groupby("EST_ST").indices.items():
        n = (weights[idx] * home.to_numpy()[idx, None]).sum(axis=0)
        m = (weights[idx] * kids.to_numpy()[idx, None]).sum(axis=0)
        num[st] = num.get(st, 0) + n
        den[st] = den.get(st, 0) + m
rows = {}
for st in sorted(num):
    theta = num[st] / den[st]
    se = float(np.sqrt((4 / 80) * ((theta[1:] - theta[0]) ** 2).sum()))
    rows[int(st)] = {"share": float(theta[0]), "replicateStandardError": se}
nat_n = sum(num[s] for s in num)
nat_d = sum(den[s] for s in den)
nat = nat_n / nat_d
rows["national"] = {
    "share": float(nat[0]),
    "replicateStandardError": float(np.sqrt((4 / 80) * ((nat[1:] - nat[0]) ** 2).sum())),
}
json.dump(rows, open(out, "w"), indent=1)
