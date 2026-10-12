"""Write src/core2/data/housing/{housing,parameters}.json from the housing research.

Eviction steps: each place's recorded statute values; a missing value takes
the median of the high- and medium-confidence places and is listed in
estimatedFields. Rents and values: ACS 2020-2024 county B25064 and B25077
(data/source/acs-county-housing-commute). Tenure: ACS B25003.
"""
import gzip, json, pathlib, statistics
ROOT = pathlib.Path(__file__).resolve().parents[3]
HERE = pathlib.Path(__file__).parent
ev = json.load(open(HERE / "eviction-steps-2026.json"))["places"]
good = [v for v in ev.values() if v.get("confidence") in ("high", "medium")]
first = lambda x: x[0] if isinstance(x, list) else x
def med(key):
    return statistics.median([first(v[key]) for v in good if first(v.get(key)) is not None])
defaults = {"noticeDays": med("noticeDays"), "answerOrHearingDays": med("answerOrHearingDays"), "appealOrStayDays": med("appealOrStayDays"), "gracePeriodDays": 0}
steps = {}
for key, v in ev.items():
    row = {"noticeDays": v.get("noticeDays"), "cureAllowed": v.get("cureAllowed"), "gracePeriodDays": v.get("gracePeriodDays") or 0, "hearingDays": first(v.get("answerOrHearingDays")), "stayDays": v.get("appealOrStayDays"), "statute": v.get("statute"), "confidence": v.get("confidence"), "estimatedFields": []}
    for field, default in [("noticeDays", "noticeDays"), ("hearingDays", "answerOrHearingDays"), ("stayDays", "appealOrStayDays")]:
        if row[field] is None:
            row[field] = defaults[default]; row["estimatedFields"].append(field)
    if row["cureAllowed"] is None:
        row["cureAllowed"] = True; row["estimatedFields"].append("cureAllowed")
    steps[key[3:]] = row
acs = json.load(gzip.open(ROOT / "data/source/acs-county-housing-commute/regional-corpus.json.gz"))
county = {r["countyFips"]: [(r.get("medianGrossRent") or {}).get("estimate", {}).get("value"), (r.get("medianOwnerOccupiedHomeValue") or {}).get("estimate", {}).get("value")] for r in acs["rows"]}
ten = json.load(open(HERE / "tenure-acs-2024.json"))
doc = {"version": "housing-data-v1", "source": {"tag": "SOURCED", "asOf": "2026-10-12", "citation": "ACS 2020-2024 B25003 tenure, B25064 median gross rent, B25077 median owner home value; state eviction statutes as recorded in data/research/housing/eviction-steps-2026.json."},
       "eviction": steps, "evictionDefaults": defaults, "countyRentValue": county, "placeTenure": ten["places"], "countyTenure": ten["counties"],
       "landlordNamePattern": "{place} Rentals", "reasons": {"notice": "rent-past-grace", "cured": "paid-within-notice", "filed": "rent-still-owed", "judgment": "rent-owed-and-notice-given", "removal": "judgment-for-possession"}}
age = json.load(open(HERE / "acs-2024-owner-mortgage-age.json"))
moved = json.load(open(HERE / "acs-2024-owner-moved-in.json"))
nar = json.load(open(HERE / "nar-2025-down-payments.json"))
doc["actions"] = {"buy": {"id": "housing-buy", "actKinds": ["commit", "change", "take-risk"]}, "rent": {"id": "housing-keep-renting", "actKinds": ["keep-same", "play-safe"]}}
doc["mortgage"] = {
    "source": "ACS 2020-2024 B25027 mortgage status by age of householder and B25038 year householder moved in (national); NAR 2025 Profile of Home Buyers and Sellers median down payments.",
    "ageBands": [{"minAge": b["minAge"], "maxAgeExclusive": b.get("maxAgeExclusive"), "mortgagedShare": round(b["mortgaged"] / (b["mortgaged"] + b["mortgageFree"]), 4)} for b in age["ageBands"]],
    "movedIn": [{"fromYear": r["fromYear"], "toYear": r["toYear"], "share": round(r["owners"] / moved["ownerOccupied"], 4)} for r in moved["periods"]],
    "downPayment": {"firstTime": nar["firstTime"]["medianShare"], "repeat": nar["repeat"]["medianShare"]},
}
hpi = json.load(open(HERE / "fhfa-hpi-state-2026q2.json"))
doc["housePriceIndex"] = {"source": hpi["table"], "states": hpi["states"]}
(ROOT / "src/core2/data/housing/housing.json").write_text(json.dumps(doc, separators=(",", ":")) + "\n")
print(defaults, sum(1 for s in steps.values() if s["confidence"] == "high"))
