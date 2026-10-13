"""Derive the 14 values' answer keys from the Cooperative Election Study 2024.

Source: Schaffner, Shih, Ansolabehere and Pope (2025), Cooperative Election
Study Common Content, 2024, Harvard Dataverse, doi:10.7910/DVN/X11EP6, V9,
file CCES24_Common_OUTPUT_vv_topost_final.csv (CC0 1.0). The microdata stays
outside the repository; only these weighted aggregates ship.

Usage: python3 derive-ces-2024-values.py <ces24.csv> <output.json>

Each value's index is the mean of its items, each scored +1 for the answer
that shows more of the value and -1 for the other (the two religion items
scaled linearly), over the items a respondent answered; it runs -1 to 1.
Items are the pre-election policy grids, checked against the codebook and
the microdata (data/research/views/ces-2024-values-map.json); a value with
no item ("transparency") gets no key. For each value: the national mean and
spread, its slope on ideo5 lean (-2 to 2) with the residual spread, and the
mean by state and age band. Weights are commonweight.
"""
import csv, json, math, sys
from collections import defaultdict

FIPS = {1:"AL",2:"AK",4:"AZ",5:"AR",6:"CA",8:"CO",9:"CT",10:"DE",11:"DC",12:"FL",13:"GA",15:"HI",16:"ID",17:"IL",18:"IN",19:"IA",20:"KS",21:"KY",22:"LA",23:"ME",24:"MD",25:"MA",26:"MI",27:"MN",28:"MS",29:"MO",30:"MT",31:"NE",32:"NV",33:"NH",34:"NJ",35:"NM",36:"NY",37:"NC",38:"ND",39:"OH",40:"OK",41:"OR",42:"PA",44:"RI",45:"SC",46:"SD",47:"TN",48:"TX",49:"UT",50:"VT",51:"VA",53:"WA",54:"WV",55:"WI",56:"WY"}
AGE_BANDS = [(18, 29), (30, 44), (45, 64), (65, 200)]
LEAN = {"1": -2, "2": -1, "3": 0, "4": 1, "5": 2}
SURVEY_YEAR = 2024
# (variable, answers showing more of the value); other answers 1-2 count against.
ITEMS = {
 "limited-government": [("CC24_328d",["1"]),("CC24_326f",["1"]),("CC24_340e",["2"]),("CC24_341d",["2"]),("CC24_326a",["2"])],
 "collective-provision": [("CC24_328e",["1"]),("CC24_341d",["1"]),("CC24_328b",["1"])],
 "local-control": [("CC24_328a",["2"])],
 "fiscal-restraint": [("CC24_341d",["2"]),("CC24_328e",["2"])],
 "equal-treatment": [("CC24_340c",["1"])],
 "personal-liberty": [("CC24_324a",["1"]),("CC24_340a",["1"]),("CC24_340b",["1"]),("CC24_321b",["1"]),("CC24_340e",["2"])],
 "public-safety": [("CC24_321c",["1"]),("CC24_321a",["1"]),("CC24_321d",["1"]),("CC24_321f",["1"]),("CC24_321e",["2"])],
 "property-rights": [("CC24_328a",["1"]),("CC24_326e",["2"]),("CC24_326f",["1"])],
 "environmental-stewardship": [("CC24_326a",["1"]),("CC24_326b",["1"]),("CC24_326c",["1"]),("CC24_326d",["2"]),("CC24_326e",["1"])],
 "equal-opportunity": [("CC24_328b",["1"]),("CC24_323d",["1"]),("CC24_328a",["1"])],
 "tradition": [("pew_religimp","scale4"),("pew_churatd","scale6"),("CC24_340c",["2"])],
 "worker-protection": [("CC24_328c",["2"]),("CC24_326c",["2"])],
 "market-competition": [("CC24_341b",["2"]),("CC24_341c",["2"]),("CC24_326d",["1"])],
}
STRENGTH = {"local-control": "weak", "equal-treatment": "weak", "property-rights": "weak", "tradition": "weak", "worker-protection": "weak", "market-competition": "weak"}

def score(code, more):
    if more == "scale4":
        return 1 - 2 * (int(code) - 1) / 3 if code in {"1","2","3","4"} else None
    if more == "scale6":
        return 1 - 2 * (int(code) - 1) / 5 if code in {"1","2","3","4","5","6"} else None
    if code not in {"1", "2"}:
        return None
    return 1.0 if code in more else -1.0

def band(age):
    for lo, hi in AGE_BANDS:
        if lo <= age <= hi:
            return f"{lo}-{hi if hi < 200 else 'plus'}"
    return None

class Acc:
    def __init__(self): self.w=self.x=self.xx=self.l=self.ll=self.xl=0.0; self.n=0
    def add(self, w, x, l):
        self.w+=w; self.x+=w*x; self.xx+=w*x*x; self.n+=1
        if l is not None: self.l+=w*l; self.ll+=w*l*l; self.xl+=w*x*l
    def mean(self): return self.x/self.w

def main(src, dst):
    f = open(src, newline="", encoding="utf-8", errors="replace")
    r = csv.reader(f); h = next(r); ix = {n: i for i, n in enumerate(h)}
    nat = defaultdict(Acc); lean_acc = defaultdict(Acc)
    cells = defaultdict(lambda: defaultdict(Acc))
    for row in r:
        try: w = float(row[ix["commonweight"]] or 0)
        except ValueError: continue
        if w <= 0: continue
        try: age = SURVEY_YEAR - int(row[ix["birthyr"]])
        except ValueError: continue
        b = band(age); st = FIPS.get(int(row[ix["inputstate"]] or 0))
        lean = LEAN.get(row[ix["ideo5"]])
        for value, items in ITEMS.items():
            scores = [s for s in (score(row[ix[v]], more) for v, more in items) if s is not None]
            if not scores: continue
            x = sum(scores) / len(scores)
            nat[value].add(w, x, lean)
            if lean is not None: lean_acc[value].add(w, x, lean)
            if st and b:
                cells[value][f"{st}:{b}"].add(w, x, lean)
                cells[value][f"US:{b}"].add(w, x, lean)
    out = {"version": "ces-2024-values-v1", "source": {"citation": "Schaffner, Shih, Ansolabehere and Pope (2025), Cooperative Election Study Common Content, 2024, Harvard Dataverse doi:10.7910/DVN/X11EP6 (CC0 1.0); weighted by commonweight; items in data/research/views/derive-ces-2024-values.py."}, "ageBands": [band(lo) for lo, _ in AGE_BANDS], "values": {}}
    for value in ITEMS:
        a = nat[value]; m = a.mean(); sd = math.sqrt(max(0.0, a.xx/a.w - m*m))
        L = lean_acc[value]
        lm = L.l/L.w; xm = L.x/L.w
        varl = L.ll/L.w - lm*lm; cov = L.xl/L.w - lm*xm
        slope = cov/varl
        resid = math.sqrt(max(0.0, (L.xx/L.w - xm*xm) - slope*cov))
        cellsOut = {}
        for key, c in sorted(cells[value].items()):
            if c.n < 30: continue
            cl = c.l/c.w if c.w else 0.0
            cellsOut[key] = {"n": c.n, "mean": round(c.mean(), 4), "leanMean": round(cl, 4)}
        out["values"][value] = {"strength": STRENGTH.get(value, "good"), "items": [v for v, _ in ITEMS[value]], "n": a.n, "mean": round(m, 4), "sd": round(sd, 4), "slopeOnLean": round(slope, 4), "residualSd": round(resid, 4), "cells": cellsOut}
    json.dump(out, open(dst, "w"), indent=1)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
