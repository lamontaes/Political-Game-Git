"""Derive the views answer keys from the Cooperative Election Study 2024.

Source: Schaffner, Shih, Ansolabehere and Pope (2025), Cooperative Election
Study Common Content, 2024, Harvard Dataverse, doi:10.7910/DVN/X11EP6, V9,
file CCES24_Common_OUTPUT_vv_topost_final.csv (CC0 1.0). The microdata stays
outside the repository; only these weighted aggregates ship.

Usage: python3 derive-ces-2024-views.py <ces24.csv> <output.json>

Lean is ideo5 on a -2 (very liberal) to +2 (very conservative) scale; "not
sure" is kept as its own share and left out of means. Engagement is newsint
on 0 (hardly at all) to 1 (most of the time); "don't know" is left out.
Weights are commonweight (all adults), as the CES guide recommends.
"""
import csv, hashlib, json, math, sys
from collections import defaultdict

FIPS = {1:"AL",2:"AK",4:"AZ",5:"AR",6:"CA",8:"CO",9:"CT",10:"DE",11:"DC",12:"FL",13:"GA",15:"HI",16:"ID",17:"IL",18:"IN",19:"IA",20:"KS",21:"KY",22:"LA",23:"ME",24:"MD",25:"MA",26:"MI",27:"MN",28:"MS",29:"MO",30:"MT",31:"NE",32:"NV",33:"NH",34:"NJ",35:"NM",36:"NY",37:"NC",38:"ND",39:"OH",40:"OK",41:"OR",42:"PA",44:"RI",45:"SC",46:"SD",47:"TN",48:"TX",49:"UT",50:"VT",51:"VA",53:"WA",54:"WV",55:"WI",56:"WY"}
AGE_BANDS = [(18, 29), (30, 44), (45, 64), (65, 200)]
EDUC = {"1": "no-college", "2": "no-college", "3": "some-college", "4": "some-college", "5": "college", "6": "college"}
FAITH = {"1": "protestant", "2": "catholic", "3": "other-faith", "4": "other-faith", "5": "other-faith", "6": "other-faith", "7": "other-faith", "8": "other-faith", "9": "none", "10": "none", "11": "none", "12": "other-faith"}
URBAN = {"1": "city", "2": "suburb", "3": "town", "4": "rural"}
LEAN = {"1": -2, "2": -1, "3": 0, "4": 1, "5": 2}
SURVEY_YEAR = 2024

def band(age):
    for lo, hi in AGE_BANDS:
        if lo <= age <= hi:
            return f"{lo}-{hi if hi < 200 else 'plus'}"
    return None

class Cell:
    __slots__ = ("w", "n", "s", "ss", "shares", "ew", "es")
    def __init__(self):
        self.w = 0.0; self.n = 0; self.s = 0.0; self.ss = 0.0
        self.shares = defaultdict(float); self.ew = 0.0; self.es = 0.0
    def add(self, w, lean, ideo, eng):
        self.shares[ideo] += w
        if lean is not None:
            self.w += w; self.n += 1; self.s += w * lean; self.ss += w * lean * lean
        if eng is not None:
            self.ew += w; self.es += w * eng
    def out(self, shares=False):
        if self.w <= 0:
            return None
        mean = self.s / self.w
        var = max(0.0, self.ss / self.w - mean * mean)
        row = {"n": self.n, "mean": round(mean, 4), "sd": round(math.sqrt(var), 4)}
        if self.ew > 0:
            row["engagement"] = round(self.es / self.ew, 4)
        if shares:
            total = sum(self.shares.values())
            names = {"1": "veryLiberal", "2": "liberal", "3": "moderate", "4": "conservative", "5": "veryConservative", "6": "notSure"}
            row["shares"] = {names[k]: round(self.shares.get(k, 0.0) / total, 4) for k in names}
        return row

def main(src, dst):
    cells = defaultdict(Cell)
    comp = defaultdict(lambda: defaultdict(float))
    raw = open(src, "rb").read()
    digest = hashlib.sha256(raw).hexdigest()
    for row in csv.DictReader(open(src, newline="")):
        try:
            w = float(row["commonweight"])
            state = FIPS[int(row["inputstate"])]
            age = SURVEY_YEAR - int(row["birthyr"])
        except (ValueError, KeyError):
            continue
        ideo = row["ideo5"]
        if ideo not in ("1", "2", "3", "4", "5", "6"):
            continue
        lean = LEAN.get(ideo)
        news = row["newsint"]
        eng = (4 - int(news)) / 3 if news in ("1", "2", "3", "4") else None
        b = band(age)
        keys = [("national",), ("state", state), ("age", b), ("state-age", state, b)]
        if row["educ"] in EDUC:
            keys += [("educ", EDUC[row["educ"]]), ("state-educ", state, EDUC[row["educ"]])]
        if row["religpew"] in FAITH:
            keys += [("faith", FAITH[row["religpew"]]), ("state-faith", state, FAITH[row["religpew"]])]
        if row["urbancity"] in URBAN:
            keys += [("urban", URBAN[row["urbancity"]]), ("state-urban", state, URBAN[row["urbancity"]])]
        # Composition: education and faith shares by state and age band.
        if row["educ"] in EDUC:
            comp[("educ", state, b)][EDUC[row["educ"]]] += w
            comp[("educ", "US", b)][EDUC[row["educ"]]] += w
        if row["religpew"] in FAITH:
            comp[("faith", state, b)][FAITH[row["religpew"]]] += w
            comp[("faith", "US", b)][FAITH[row["religpew"]]] += w
        if row["educ"] in EDUC and row["religpew"] in FAITH:
            keys.append(("profile", b, EDUC[row["educ"]], FAITH[row["religpew"]]))
        county = row["countyfips"]
        if county and county != "NA":
            keys.append(("county", county.zfill(5)))
        for key in keys:
            cells[key].add(w, lean, ideo, eng)
    out = {
        "version": "ces-2024-views-v1",
        "source": {
            "tag": "SOURCED",
            "citation": "Schaffner, Brian; Shih, Marissa; Ansolabehere, Stephen; Pope, Jeremy (2025). Cooperative Election Study Common Content, 2024. Harvard Dataverse, doi:10.7910/DVN/X11EP6, V9 (CC0 1.0). Weighted with commonweight; ideo5 as lean from -2 (very liberal) to +2 (very conservative); newsint as engagement from 0 to 1.",
            "fileSha256": digest,
            "derivedBy": "data/research/views/derive-ces-2024-views.py",
        },
        "ageBands": [f"{lo}-{hi if hi < 200 else 'plus'}" for lo, hi in AGE_BANDS],
        "national": cells[("national",)].out(True),
        "byAge": {k[1]: c.out() for k, c in cells.items() if k[0] == "age"},
        "byEducation": {k[1]: c.out() for k, c in cells.items() if k[0] == "educ"},
        "byFaith": {k[1]: c.out() for k, c in cells.items() if k[0] == "faith"},
        "byUrbanicity": {k[1]: c.out() for k, c in cells.items() if k[0] == "urban"},
        "states": {},
        "counties": {},
    }
    for state in sorted(set(FIPS.values())):
        row = cells[("state", state)].out(True)
        if not row:
            continue
        for label, kind in (("byAge", "state-age"), ("byEducation", "state-educ"), ("byFaith", "state-faith"), ("byUrbanicity", "state-urban")):
            row[label] = {k[2]: c.out() for k, c in cells.items() if k[0] == kind and k[1] == state}
        out["states"][state] = row
    # Counties with enough respondents to check a town's spread against.
    for k, c in sorted(cells.items()):
        if k[0] == "county" and c.n >= 30:
            out["counties"][k[1]] = c.out()
    # How much places differ within each state: the spread of its county
    # means (counties with 30 or more respondents), weighted by respondents.
    usps = {f"{fips:02d}": code for fips, code in FIPS.items()}
    for state, row in out["states"].items():
        rows = [c for fips, c in out["counties"].items() if usps.get(fips[:2]) == state]
        if len(rows) >= 2:
            total = sum(c["n"] for c in rows)
            mean = sum(c["mean"] * c["n"] for c in rows) / total
            row["countySpread"] = round(math.sqrt(sum(c["n"] * (c["mean"] - mean) ** 2 for c in rows) / total), 4)
            row["countiesChecked"] = len(rows)
    def shares(kind, where, b):
        row = comp[(kind, where, b)]
        total = sum(row.values())
        return {k: round(v / total, 4) for k, v in sorted(row.items())} if total else None
    for state, row in out["states"].items():
        row["educationShares"] = {b: shares("educ", state, b) for b in out["ageBands"]}
        row["faithShares"] = {b: shares("faith", state, b) for b in out["ageBands"]}
    out["nationalEducationShares"] = {b: shares("educ", "US", b) for b in out["ageBands"]}
    out["nationalFaithShares"] = {b: shares("faith", "US", b) for b in out["ageBands"]}
    # How far each education-and-faith profile leans from its age band's
    # national mean, so a state-by-age cell can carry a person's profile.
    out["profileShift"] = {}
    for k, c in cells.items():
        if k[0] != "profile" or c.n < 30:
            continue
        age_band, educ, faith = k[1], k[2], k[3]
        row = c.out()
        out["profileShift"].setdefault(age_band, {}).setdefault(educ, {})[faith] = {
            "n": row["n"],
            "shift": round(row["mean"] - out["byAge"][age_band]["mean"], 4),
        }
    json.dump(out, open(dst, "w"), indent=1, sort_keys=False)
    open(dst, "a").write("\n")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
