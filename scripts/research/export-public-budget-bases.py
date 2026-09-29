"""Export the opening amounts every government's budget is drawn around.

Reads three research files already in the repository and writes
data/research/money/public-budget-bases.json, which the game imports
(src/simulation/public-budgets/opening.ts):

1. data/research/money/state-local-finances-2022.json: the Census Bureau's
   2022 state and local government finances. Each state's state-only and
   local-only columns become dollars per resident (fiscal 2022 dollars over
   the file's own 2023 residents), grouped into the budget's revenue sources
   and spending programs.
2. data/research/money/government-budgets-2026.json: NASBO's fiscal 2026
   general fund ending balance and rainy-day balance, fiscal-year start and
   budget cycle, and for a territory its totals.
3. data/research/money/population-2024.json: BEA 2024 population for each
   state, D.C. and county (scripts/research/export-bea-population-2024.py).
4. The four island areas' 2020 populations, which BEA does not publish, from
   the Census Bureau's 2020 Island Areas Censuses (ISLAND_AREA_POPULATION
   below, read from the source on September 28, 2026).
5. Puerto Rico's population on July 1, 2025, the sum of the Census Bureau's
   Vintage 2025 municipio estimates already in the repository (PR_MUNICIPIOS).

The calibration factor carrying 2022 dollars to 2026 is measured here:
NASBO's fiscal 2025 all-funds state spending over Census 2022 state
expenditure, summed across the 50 states.

The budget covers general government only. Census counts utilities
(including transit systems), liquor stores and insurance trusts separately,
and they are left out of both revenue and spending.

Run: python3 scripts/research/export-public-budget-bases.py
"""

import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
FINANCES = ROOT / "data/research/money/state-local-finances-2022.json"
BUDGETS = ROOT / "data/research/money/government-budgets-2026.json"
POPULATION = ROOT / "data/research/money/population-2024.json"
OUT = ROOT / "data/research/money/public-budget-bases.json"
PR_MUNICIPIOS = (
    ROOT
    / "docs/research/chatgpt-answers/2026-09-23-cto-handoff-2230"
    / "DATA-Census-Vintage-2025-Puerto-Rico-municipios.csv"
)

# The Census Bureau's 2020 Island Areas Censuses, "First 2020 Census United
# States Island Areas Data Released Today" (October 28, 2021):
# https://www.census.gov/library/stories/2021/10/first-2020-census-united-states-island-areas-data-released-today.html
ISLAND_AREA_POPULATION = {
    "US-AS": 49_710,
    "US-GU": 153_836,
    "US-MP": 47_329,
    "US-VI": 87_146,
}

# Budget revenue sources, each a sum of Census lines.
SOURCES = {
    "individualIncomeTax": ["individualIncomeTax"],
    "corporateIncomeTax": ["corporateIncomeTax"],
    "generalSalesTax": ["generalSalesTax"],
    "selectiveSalesTaxes": ["selectiveSalesTaxes"],
    "propertyTax": ["propertyTax"],
    "vehicleAndOtherTaxes": ["motorVehicleLicenseTax", "otherTaxes"],
    "chargesAndFees": ["currentCharges"],
    "miscellaneous": ["miscellaneousGeneralRevenue"],
    "federalAid": ["fromFederalGovernment"],
    # For a local government: aid from its state. For a state: payments from
    # its local governments.
    "intergovernmental": ["fromStateGovernment", "fromLocalGovernments"],
}

# Budget spending programs, each a sum of Census lines. "otherPrograms" is the
# rest of direct general expenditure; "localAid" is a state's
# intergovernmental expenditure.
PROGRAMS = {
    "schools": ["elementaryAndSecondaryEducation", "otherEducation"],
    "higherEducation": ["higherEducation"],
    "welfareAndMedicaid": ["publicWelfare"],
    "healthAndHospitals": ["health", "hospitals"],
    "highways": ["highways"],
    "police": ["police"],
    "fire": ["fire"],
    "corrections": ["corrections"],
    "parks": ["parksAndRecreation"],
    "housing": ["housingAndCommunityDevelopment"],
    "naturalResources": ["naturalResources"],
    "administration": [
        "financialAdministration",
        "judicialAndLegal",
        "generalPublicBuildings",
        "otherGovernmentalAdministration",
    ],
    "interest": ["interestOnGeneralDebt"],
}


def per_resident(dollars: dict, population: int) -> dict:
    revenue = {
        key: round(sum(dollars[line] for line in lines) / population, 2)
        for key, lines in SOURCES.items()
    }
    general_revenue = sum(
        dollars[line] for lines in SOURCES.values() for line in lines
    )
    if general_revenue != dollars["generalRevenue"]:
        raise SystemExit("revenue sources do not add to general revenue")
    mapped = sum(
        dollars[line] for lines in PROGRAMS.values() for line in lines
    )
    spending = {
        key: round(sum(dollars[line] for line in lines) / population, 2)
        for key, lines in PROGRAMS.items()
    }
    # Interest on general debt is part of direct general expenditure.
    spending["otherPrograms"] = round(
        (dollars["directGeneralExpenditure"] - mapped) / population, 2
    )
    spending["localAid"] = round(
        dollars["intergovernmentalExpenditure"] / population, 2
    )
    return {
        "revenue": revenue,
        "spending": spending,
        "debt": round(dollars["debtOutstanding"] / population, 2),
    }


def millions(row: dict, key: str):
    value = row.get(key)
    return value if isinstance(value, (int, float)) else None


def main() -> None:
    finances = json.loads(FINANCES.read_text())
    budgets = json.loads(BUDGETS.read_text())
    population = json.loads(POPULATION.read_text())["population"]

    nasbo_total = 0.0
    census_total = 0
    for key, row in budgets["places"].items():
        spending = row.get("stateSpendingAllFundsMillions", {})
        total = spending.get("fy2025Estimated", {}).get("total")
        census = finances["places"].get(key)
        if key == "US-DC" or census is None or not isinstance(total, (int, float)):
            continue
        nasbo_total += total * 1_000_000
        census_total += census["dollars"]["state"]["expenditure"]
    calibration = round(nasbo_total / census_total, 4)

    places = {}
    for key, row in sorted(budgets["places"].items()):
        fiscal = row.get("fiscalYear", {})
        general = row.get("generalFundFY2026EstimatedMillions", {})
        place = {
            "name": row["name"],
            "fiscalYearStart": fiscal.get("startsOn"),
            "budgetCycle": fiscal.get("budgetCycle"),
            "generalFundFY2026Millions": {
                "revenues": millions(general, "revenues"),
                "expenditures": millions(general, "expenditures"),
                "endingBalance": millions(general, "endingBalance"),
                "rainyDayFundBalance": millions(general, "rainyDayFundBalance"),
            },
        }
        census = finances["places"].get(key)
        fips = None
        if census is not None:
            usps = key[3:]
            fips = next(
                (
                    code
                    for code, _ in population.items()
                    if code.endswith("000") and STATE_FIPS.get(usps) == code[:2]
                ),
                None,
            )
            pop2023 = census["population2023"]
            place["population2024"] = population[fips] if fips else None
            place["state"] = per_resident(census["dollars"]["state"], pop2023)
            place["local"] = per_resident(census["dollars"]["local"], pop2023)
        else:
            all_funds = row.get("stateSpendingAllFundsMillions", {}).get(
                "fy2025Estimated", {}
            )
            place["territoryAllFundsSpendingFY2025Millions"] = (
                all_funds.get("total")
                if isinstance(all_funds.get("total"), (int, float))
                else None
            )
            if key in ISLAND_AREA_POPULATION:
                place["islandAreaPopulation2020"] = ISLAND_AREA_POPULATION[key]
            if key == "US-PR":
                with PR_MUNICIPIOS.open(newline="") as handle:
                    place["puertoRicoPopulation2025"] = sum(
                        int(row["population_2025_07_01"])
                        for row in csv.DictReader(handle)
                    )
        places[key] = place

    counties = {
        code: count
        for code, count in population.items()
        if not code.endswith("000")
    }
    out = {
        "id": "public-budget-bases",
        "derivedFrom": [
            "data/research/money/state-local-finances-2022.json",
            "data/research/money/government-budgets-2026.json",
            "data/research/money/population-2024.json",
            "https://www.census.gov/library/stories/2021/10/first-2020-census-united-states-island-areas-data-released-today.html",
            "docs/research/chatgpt-answers/2026-09-23-cto-handoff-2230/DATA-Census-Vintage-2025-Puerto-Rico-municipios.csv",
        ],
        "script": "scripts/research/export-public-budget-bases.py",
        "scope": "General government only: Census utilities (including transit systems), liquor stores and insurance trusts are left out of revenue and spending. Per-resident values are fiscal 2022 dollars over 2023 residents.",
        "calibration": {
            "factor": calibration,
            "basis": "NASBO fiscal 2025 all-funds state spending divided by Census 2022 state expenditure, summed across the 50 states. It carries 2022 amounts to the game's opening year and is a calibration, not a price index.",
        },
        "places": places,
        "countyPopulation2024": counties,
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(
        f"calibration {calibration}; wrote {len(places)} places and "
        f"{len(counties)} counties to {OUT.relative_to(ROOT)}"
    )


# Two-digit state FIPS codes, for reading a state's BEA row.
STATE_FIPS = {
    "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06", "CO": "08",
    "CT": "09", "DE": "10", "DC": "11", "FL": "12", "GA": "13", "HI": "15",
    "ID": "16", "IL": "17", "IN": "18", "IA": "19", "KS": "20", "KY": "21",
    "LA": "22", "ME": "23", "MD": "24", "MA": "25", "MI": "26", "MN": "27",
    "MS": "28", "MO": "29", "MT": "30", "NE": "31", "NV": "32", "NH": "33",
    "NJ": "34", "NM": "35", "NY": "36", "NC": "37", "ND": "38", "OH": "39",
    "OK": "40", "OR": "41", "PA": "42", "RI": "44", "SC": "45", "SD": "46",
    "TN": "47", "TX": "48", "UT": "49", "VT": "50", "VA": "51", "WA": "53",
    "WV": "54", "WI": "55", "WY": "56",
}

if __name__ == "__main__":
    main()
