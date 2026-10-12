"""Build the laws module's starting-law table from the sourced research files.

Every row the laws module loads at the opening comes from here: one row per
jurisdiction, series, tier and dated phase, each with its source, retrieval
date and estimate flag. Jurisdiction keys: "US" (federal), "US-XX" (state,
district or territory), "county:<5-digit FIPS>", "place:<7-digit GEOID>".

Inputs (all under data/research):
  money/minimum-wage-dated-matrix-2026.json     federal and state minimum wages
  money/federal-income-tax-schedules.json       IRS 2026 schedules
  money/state-income-tax-2026.json              state single-filer schedules
  laws/local-starting-law/*.json                local and benefit research
  laws/starting-law-2026/labor-workforce.json   local minimum-wage authority

Run: python3 scripts/research/build-starting-law.py
"""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
RESEARCH = ROOT / "data/research"
LOCAL = RESEARCH / "laws/local-starting-law"
OUT = ROOT / "src/core2/data/laws/starting-law.json"
RETRIEVED = "2026-10-12"
FOREVER = None

# Minimum-wage tiers that are the general rate for an ordinary employer, in
# the order a place's general rate is chosen. Region tiers name their counties
# in data/research/laws/local-starting-law/minimum-wage-regions.json.
GENERAL_TIERS = [
    "statewide",
    "most-employers",
    "all-employers",
    "above-small-employer-threshold",
    "four-or-more-employees",
    "four-or-more-employees-adults",
    "two-or-more-employees",
    "six-or-more-employees-per-location",
    "flsa-covered",
    "miscellaneous",
]


def load(path):
    return json.loads(path.read_text())


def optional(name):
    path = LOCAL / name
    return load(path) if path.exists() else None


def row(jurisdiction, level, series, value, effective, end, source, estimate,
        tier="general", unit=None, terms=None, note=None, retrieved=RETRIEVED):
    out = {
        "jurisdiction": jurisdiction,
        "level": level,
        "series": series,
        "tier": tier,
        "value": value,
        "effectiveDate": effective,
        "endDate": end,
        "source": source,
        "retrieved": retrieved,
        "estimate": bool(estimate),
    }
    if unit:
        out["unit"] = unit
    if terms is not None:
        out["terms"] = terms
    if note:
        out["note"] = note
    return out


def dated(rows):
    """Close each tier's phases: a phase ends when the next one starts.

    A later row with the same amount is a re-reading of the law already in
    force (a page read on a later date), not a new phase, so it is dropped.
    """
    by = {}
    for item in rows:
        by.setdefault((item["jurisdiction"], item["series"], item["tier"], item["level"]), []).append(item)
    rereadings = set()
    for phases in by.values():
        phases.sort(key=lambda r: r["effectiveDate"])
        kept = phases[:1]
        for item in phases[1:]:
            if item["value"] == kept[-1]["value"] and item.get("terms", {}).get("counties") == kept[-1].get("terms", {}).get("counties") and item["series"] == "minimum-wage":
                rereadings.add(id(item))
            else:
                kept.append(item)
        phases[:] = kept
        for current, following in zip(phases, phases[1:]):
            if current["endDate"] is None or current["endDate"] > following["effectiveDate"]:
                current["endDate"] = following["effectiveDate"]
    return [item for item in rows if id(item) not in rereadings]


def minimum_wages(rows):
    matrix = load(RESEARCH / "money/minimum-wage-dated-matrix-2026.json")
    regions = optional("minimum-wage-regions.json") or {"regions": {}}
    federal = matrix["federalFloor"]
    rows.append(row("US", "federal", "minimum-wage", federal["value"], federal["operativeAt"],
                    FOREVER, federal["source"], False, unit="minor/hour"))
    for state, place in matrix["places"].items():
        tiers = {r["tier"] for r in place["rows"]}
        general = next((t for t in GENERAL_TIERS if t in tiers), None)
        for item in place["rows"]:
            if item["level"] == "federal" and item["tierKind"] == "federal-floor":
                continue  # the national floor row above covers it
            tier = item["tier"]
            if tier == general:
                tier = "general"
            level = "federal" if item["level"] == "federal" else "state"
            terms = {"tierKind": item["tierKind"], "basis": item.get("operativeBasis")}
            counties = regions["regions"].get(state, {}).get(item["tier"])
            if counties is not None:
                terms["counties"] = counties
            rows.append(row(state, level, "minimum-wage", item["value"], item["operativeAt"],
                            FOREVER, item["source"], item.get("estimated", False), tier=tier,
                            unit="minor/hour", terms=terms, note=item.get("note")))
    local = optional("local-minimum-wage.json")
    for item in (local or {}).get("rows", []):
        key = ("county:" if item["kind"] == "county" else "place:") + item["censusGeoid"]
        level = "county" if item["kind"] == "county" else "city"
        rows.append(row(key, level, "minimum-wage", round(item["rate"] * 100), item["effectiveDate"],
                        item.get("endDateExclusive"), item["source"], item.get("estimate", False),
                        unit="minor/hour", note=item.get("jurisdictionName"),
                        terms={"coversUnincorporatedOnly": bool(item.get("coversUnincorporatedOnly", False)),
                               **{k: item[k] for k in ("smallEmployerRate", "midEmployerRate", "microEmployerRate") if item.get(k) is not None}},
                        retrieved=item.get("retrievedDate", RETRIEVED)))


def local_wage_authority(rows):
    questions = load(RESEARCH / "laws/starting-law-2026/labor-workforce.json")["questions"]
    question = questions["us-policy-positions:labor-workforce.local-minimum-wage-authority"]
    for state, answer in question["answers"].items():
        rows.append(row(state, "state", "local-minimum-wage-authority",
                        1 if answer["answer"] == "yes" else 0, answer.get("operativeAt", "2000-01-01"),
                        FOREVER, answer.get("source") or question["source"], "estimated" in answer,
                        terms={"preempts": bool(answer.get("preempts", False)),
                               "answer": answer["answer"], "cite": answer.get("cite")}))


def income_taxes(rows):
    federal = load(RESEARCH / "money/federal-income-tax-schedules.json")
    for record in federal["records"]:
        schedules = {}
        source = None
        for filing, schedule in record["schedules"].items():
            source = schedule.get("sourceUrl", source)
            schedules[filing] = {
                "standardDeduction": schedule["standardDeductionMinor"] / 100,
                "brackets": [{"over": b["overMinor"] / 100, "rate": b["rateBasisPoints"] / 100}
                             for b in schedule["brackets"]],
            }
        rows.append(row("US", "federal", "income-tax", schedules["single"]["brackets"][-1]["rate"],
                        f"{record['taxYear']}-01-01", f"{record['taxYear'] + 1}-01-01", source, False,
                        unit="percent-top-rate", terms={"system": "graduated", "schedules": schedules}))
    states = load(RESEARCH / "money/state-income-tax-2026.json")
    married = (optional("state-income-tax-married-2026.json") or {}).get("places", {})
    for state, place in states["places"].items():
        brackets = [{"over": b["overSingle"], "rate": b["ratePercent"]} for b in place["brackets"]]
        schedules = {"single": {"standardDeduction": place.get("standardDeductionSingle"), "brackets": brackets}}
        m = married.get(state)
        if m:
            # Law in force on the start date: the January 1 table, even where a
            # later 2026 act changed the year back to January 1.
            table = m.get("taxFoundationTableRow") or {}
            joint = table.get("brackets") or m["brackets"]
            deduction = table.get("standardDeductionMarriedJoint") or m.get("standardDeductionMarriedJoint")
            schedules["married-filing-jointly"] = {
                "standardDeduction": deduction.get("amount") if isinstance(deduction, dict) else deduction,
                "personalExemption": (m.get("personalExemptionMarriedJoint") or {}).get("amount"),
                "brackets": [{"over": b["overMarriedJoint"], "rate": b["ratePercent"]} for b in joint],
                "source": m["source"]["url"] if isinstance(m.get("source"), dict) else m.get("source"),
                "estimate": m.get("estimate", False),
            }
            if table:
                schedules["laterIn2026"] = {"note": " ".join(m.get("notes", [])), "brackets": m["brackets"]}
        top = brackets[-1]["rate"] if brackets else 0
        rows.append(row(state, "state", "income-tax", top, "2026-01-01", "2027-01-01",
                        states["source"]["url"], False, unit="percent-top-rate",
                        terms={"system": place["wageIncomeTax"], "schedules": schedules}))
    territories = (optional("territory-income-tax-2026.json") or {}).get("places", {})
    for state, place in territories.items():
        brackets = [{"over": b["overSingle"], "rate": b["ratePercent"]} for b in place.get("bracketsSingle") or []]
        source = place["source"]["url"] if isinstance(place["source"], dict) else place["source"]
        rows.append(row(state, "state", "income-tax", brackets[-1]["rate"] if brackets else None, "2026-01-01",
                        "2027-01-01", source, place.get("estimate", False), unit="percent-top-rate",
                        terms={"system": place.get("system"), "mirrorsFederal": place.get("mirrorsFederal"),
                               "replacesFederal": True,
                               "schedules": {"single": {"standardDeduction": place.get("standardDeduction"),
                                                        "brackets": brackets}},
                               "otherTaxes": place.get("otherTaxes")},
                        note="Residents pay the territory's income tax in place of the federal income tax on local income."))
    local = optional("local-income-tax.json")
    for item in (local or {}).get("states", []):
        rows.append(row(item["stateKey"], "state", "local-income-tax-authority", 1 if item["allowed"] else 0,
                        "2026-01-01", FOREVER, item["source"], item.get("estimate", False),
                        terms={k: item.get(k) for k in ("kind", "typicalRate", "rateMin", "rateMax")}))
    for item in (local or {}).get("jurisdictions", []):
        geoid = item.get("censusGeoid")
        if not geoid:
            continue  # a special district spanning counties: needs its own boundary (not yet mapped)
        key = ("county:" if len(geoid) == 5 else "place:") + geoid
        rows.append(row(key, "county" if len(geoid) == 5 else "city", "income-tax", item["residentRate"],
                        item.get("effectiveDate", "2026-01-01"), item.get("endDateExclusive"), item["source"],
                        item.get("estimate", False), unit="percent-flat",
                        terms={"nonresidentRate": item.get("nonresidentRate"), "base": item.get("base"),
                               "kind": item.get("kind")},
                        note=item.get("jurisdictionName"), retrieved=item.get("retrievedDate", RETRIEVED)))


def sales_taxes(rows):
    sales = optional("sales-tax.json")
    for state, place in (sales or {}).get("places", {}).items():
        source = place.get("stateRateSource") or place.get("source") or place.get("combinedAvgSource")
        estimate = place.get("estimate", False) or not place.get("stateRateOfficialChecked", True) and "taxfoundation" not in (source or "")
        rows.append(row(state, "state", "sales-tax", place["stateRate"], "2026-01-01", FOREVER,
                        source, estimate, unit="percent", terms={"kind": place.get("kind")},
                        note=place.get("note")))
        if place.get("localAllowed") and place.get("avgLocalRate") is not None:
            rows.append(row(state, "state", "local-sales-tax-average", place["avgLocalRate"], "2026-01-01",
                            FOREVER, place.get("avgLocalRateSource", source), True, unit="percent",
                            terms={"spreadLow": place.get("localRateMin"), "spreadHigh": place.get("localRateMax"),
                                   "appliesAs": "the state's average local rate: this place's own rate is not sampled"}))
        for sample in place.get("samples", []):
            if not sample.get("censusPlaceGeoid") or sample.get("combinedRate") is None:
                continue
            local = round(sample["combinedRate"] - place["stateRate"], 4)
            rows.append(row("place:" + sample["censusPlaceGeoid"], "city", "sales-tax", local, "2026-01-01",
                            FOREVER, sample["source"], sample.get("estimate", False), unit="percent",
                            terms={"combinedRate": sample["combinedRate"], "includes": "every local level together"},
                            note=sample.get("placeName"), retrieved=sample.get("retrievedDate", RETRIEVED)))
        for change in place.get("rateChanges2026", []):
            if change.get("newStateRate") is None:
                continue
            rows.append(row(state, "state", "sales-tax", change["newStateRate"], change["effective"], FOREVER,
                            change.get("source", source), change.get("estimate", False), unit="percent",
                            terms={"kind": place.get("kind")}, note=change.get("what")))


def benefits(rows):
    snap = load(LOCAL / "snap-maximums.json")
    for state, items in snap["places"].items():
        for item in items:
            sizes = item["maximumByHouseholdSize"]
            rows.append(row(state, "federal", "snap-maximum", sizes["1"], item["effectiveDate"],
                            item["endDateExclusive"], item["source"], item.get("estimate", False),
                            tier=item["area"] if item["area"].startswith("rural") else "general",
                            note="Alaska's rural areas are separate tiers; a place reads the urban amount until its area is mapped." if state == "US-AK" and item["area"] == "urban" else None,
                            unit="USD/month", terms={"area": item["area"], "byHouseholdSize": sizes,
                                                     "additionalPerson": item.get("additionalPersonAboveEight")},
                            retrieved=item.get("retrievalDate", RETRIEVED)))
    ui = load(LOCAL / "unemployment-weekly-bounds.json")
    for state, items in ui["places"].items():
        for item in items:
            rows.append(row(state, "state", "unemployment-weekly-maximum", item["maximumPublished"][0],
                            item["effectiveDate"], FOREVER, item["source"], item.get("estimate", False),
                            unit="USD/week", terms={"minimum": item["minimumPublished"],
                                                    "maximum": item["maximumPublished"],
                                                    "rangeBasis": item.get("rangeBasis")},
                            retrieved=item.get("retrievalDate", RETRIEVED)))
    medicaid = load(LOCAL / "medicaid-match.json")
    for state, items in medicaid["places"].items():
        for item in items:
            rows.append(row(state, "federal", "medicaid-match", item["value"], item["effectiveDate"],
                            item["endDateExclusive"], item["source"], item.get("estimate", False),
                            unit="percent", retrieved=item.get("retrievalDate", RETRIEVED)))
    extra = optional("benefit-gaps.json")
    for item in (extra or {}).get("rows", []):
        rows.append(item)


def property_taxes():
    data = load(LOCAL / "property-tax-effective.json")
    states = {k: {"rate": v["rate"], "spreadLow": v["spreadLow"], "spreadHigh": v["spreadHigh"]}
              for k, v in data["states"].items()}
    for item in (optional("territory-property-tax.json") or {}).get("rows", []):
        states[item["stateKey"]] = {"rate": item["rate"], "spreadLow": item.get("spreadLow", item["rate"]),
                                    "spreadHigh": item.get("spreadHigh", item["rate"]),
                                    "source": item["source"], "basis": item.get("basis")}
    return {
        "series": "property-tax",
        "unit": "percent of home value per year",
        "source": data["sources"],
        "method": data["method"],
        "retrieved": data["retrieved"],
        "estimate": True,
        "states": states,
        "counties": data["counties"],
    }


def main():
    rows = []
    minimum_wages(rows)
    local_wage_authority(rows)
    income_taxes(rows)
    sales_taxes(rows)
    benefits(rows)
    rows = dated(rows)
    by_jurisdiction = {}
    for item in rows:
        key = item.pop("jurisdiction")
        by_jurisdiction.setdefault(key, []).append(item)
    document = {
        "id": "starting-law-in-force-2026",
        "about": "Law in force at every level for each place, from the sourced research files. Built by scripts/research/build-starting-law.py; edit the research, not this file.",
        "built": RETRIEVED,
        "jurisdictions": dict(sorted(by_jurisdiction.items())),
        "propertyTax": property_taxes(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, separators=(",", ":")) + "\n")
    print(len(rows), "rows in", len(by_jurisdiction), "jurisdictions")


if __name__ == "__main__":
    main()
