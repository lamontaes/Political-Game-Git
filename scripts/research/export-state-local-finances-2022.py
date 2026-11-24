"""Export the Census 2022 state and local government finance table to JSON.

Reads data/source/government-finances/census-tables/22slsstab1.xlsx (added in
#860, SHA-256 in that folder's README) and writes
data/research/money/state-local-finances-2022.json: for the nation, each state
and D.C., revenue by source, spending by function, debt and holdings, each for
state and local governments combined, the state alone and local governments
alone, in dollars. Per-resident values divide by BEA's 2023 population
(data/source/bea-regional), the nearest year the repository holds, and are
labeled that way. The territories are not in the table and are not written.

Run: python3 scripts/research/export-state-local-finances-2022.py
Needs openpyxl.
"""

import hashlib
import json
import pathlib

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data/source/government-finances/census-tables/22slsstab1.xlsx"
EXPECTED_SHA256 = "4dd123c5ad520e33d9692f622d389a020e2d3a7e6e782763663854dd84643b9b"
POPULATION = ROOT / "data/source/bea-regional/corpus.json"
OUT = ROOT / "data/research/money/state-local-finances-2022.json"

# Census line number -> key. Lines are the table's own numbering.
LINES = {
    1: "revenue",
    2: "generalRevenue",
    4: "fromFederalGovernment",
    5: "fromStateGovernment",
    6: "fromLocalGovernments",
    7: "ownSourceGeneralRevenue",
    8: "taxes",
    9: "propertyTax",
    11: "generalSalesTax",
    12: "selectiveSalesTaxes",
    13: "motorFuelTax",
    18: "individualIncomeTax",
    19: "corporateIncomeTax",
    20: "motorVehicleLicenseTax",
    21: "otherTaxes",
    23: "currentCharges",
    38: "miscellaneousGeneralRevenue",
    39: "interestEarnings",
    43: "utilityRevenue",
    48: "liquorStoreRevenue",
    49: "insuranceTrustRevenue",
    50: "unemploymentCompensationRevenue",
    51: "employeeRetirementRevenue",
    54: "expenditure",
    55: "intergovernmentalExpenditure",
    56: "directExpenditure",
    58: "capitalOutlay",
    62: "interestOnDebt",
    64: "salariesAndWages",
    66: "directGeneralExpenditure",
    69: "education",
    71: "higherEducation",
    73: "elementaryAndSecondaryEducation",
    75: "otherEducation",
    76: "libraries",
    77: "publicWelfare",
    81: "hospitals",
    83: "health",
    84: "employmentSecurityAdministration",
    85: "veteransServices",
    86: "highways",
    88: "airports",
    90: "seaAndInlandPorts",
    92: "police",
    93: "fire",
    94: "corrections",
    96: "protectiveInspection",
    97: "naturalResources",
    99: "parksAndRecreation",
    101: "housingAndCommunityDevelopment",
    102: "sewerage",
    104: "solidWaste",
    106: "financialAdministration",
    107: "judicialAndLegal",
    108: "generalPublicBuildings",
    109: "otherGovernmentalAdministration",
    110: "interestOnGeneralDebt",
    111: "miscellaneousCommercialActivities",
    112: "otherAndUnallocable",
    113: "utilityExpenditure",
    118: "transitExpenditure",
    119: "liquorStoreExpenditure",
    120: "insuranceTrustExpenditure",
    121: "unemploymentCompensationPaid",
    122: "employeeRetirementPaid",
    125: "debtOutstanding",
    126: "shortTermDebt",
    127: "longTermDebt",
    134: "longTermDebtIssued",
    135: "longTermDebtRetired",
    136: "cashAndSecurityHoldings",
}

USPS = {
    "United States Total": "US", "Alabama": "US-AL", "Alaska": "US-AK",
    "Arizona": "US-AZ", "Arkansas": "US-AR", "California": "US-CA",
    "Colorado": "US-CO", "Connecticut": "US-CT", "Delaware": "US-DE",
    "District of Columbia": "US-DC", "Florida": "US-FL", "Georgia": "US-GA",
    "Hawaii": "US-HI", "Idaho": "US-ID", "Illinois": "US-IL",
    "Indiana": "US-IN", "Iowa": "US-IA", "Kansas": "US-KS",
    "Kentucky": "US-KY", "Louisiana": "US-LA", "Maine": "US-ME",
    "Maryland": "US-MD", "Massachusetts": "US-MA", "Michigan": "US-MI",
    "Minnesota": "US-MN", "Mississippi": "US-MS", "Missouri": "US-MO",
    "Montana": "US-MT", "Nebraska": "US-NE", "Nevada": "US-NV",
    "New Hampshire": "US-NH", "New Jersey": "US-NJ", "New Mexico": "US-NM",
    "New York": "US-NY", "North Carolina": "US-NC", "North Dakota": "US-ND",
    "Ohio": "US-OH", "Oklahoma": "US-OK", "Oregon": "US-OR",
    "Pennsylvania": "US-PA", "Rhode Island": "US-RI",
    "South Carolina": "US-SC", "South Dakota": "US-SD",
    "Tennessee": "US-TN", "Texas": "US-TX", "Utah": "US-UT",
    "Vermont": "US-VT", "Virginia": "US-VA", "Washington": "US-WA",
    "West Virginia": "US-WV", "Wisconsin": "US-WI", "Wyoming": "US-WY",
}


def dollars(cell):
    """Thousands of dollars to dollars; '-' and blanks are zero per the table's
    own note ("zero or rounds to zero"); '(X)' (not applicable) is None."""
    if cell is None or cell == "" or (isinstance(cell, str) and cell.strip() == "-"):
        return 0
    if isinstance(cell, str) and cell.strip() == "(X)":
        return None
    return int(round(float(cell) * 1000))


def populations_2023():
    rows = json.loads(POPULATION.read_text())
    by_fips = {}
    for row in rows:
        if (
            row.get("lineCode") == "2"
            and row.get("lineDescription") == "Population (persons)"
            and row["recordId"].endswith(":2023")
        ):
            if row["value"].get("state") == "KNOWN":
                by_fips[row["geoName"].rstrip(" *")] = row["value"]["value"]
    return by_fips


def main():
    digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        raise SystemExit(f"Source hash mismatch: {digest}")
    sheet = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True).worksheets[0]
    rows = list(sheet.iter_rows(values_only=True))
    header = rows[8]
    starts = {}
    for index, name in enumerate(header):
        if isinstance(name, str) and name.strip() in USPS:
            starts[USPS[name.strip()]] = index
    if len(starts) != 52:
        raise SystemExit(f"Expected 52 geographies, found {len(starts)}")
    by_line = {row[0]: row for row in rows if isinstance(row[0], int)}
    missing = sorted(set(LINES) - set(by_line))
    if missing:
        raise SystemExit(f"Missing Census lines: {missing}")
    population = populations_2023()
    names = {code: name for name, code in USPS.items()}
    places = {}
    for code, start in sorted(starts.items()):
        levels = {"stateAndLocal": {}, "state": {}, "local": {}}
        for line, key in LINES.items():
            row = by_line[line]
            levels["stateAndLocal"][key] = dollars(row[start])
            levels["state"][key] = dollars(row[start + 2])
            levels["local"][key] = dollars(row[start + 3])
        pop_name = "United States" if code == "US" else names[code]
        pop = population.get(pop_name)
        per_resident = None
        if pop:
            per_resident = {
                key: (None if value is None else round(value / pop, 2))
                for key, value in levels["stateAndLocal"].items()
            }
        places[code] = {
            "name": names[code],
            "dollars": levels,
            "population2023": pop,
            "stateAndLocalPerResident": per_resident,
        }
    out = {
        "id": "state-local-finances-2022",
        "asOf": "2022",
        "sourceKind": "official",
        "source": {
            "title": "State and Local Government Finances by Level of Government and by State: 2022 (Table 1)",
            "publisher": "U.S. Census Bureau, 2022 Census of Governments: Finance",
            "url": "https://www2.census.gov/programs-surveys/gov-finances/tables/2022/22slsstab1.xlsx",
            "file": "data/source/government-finances/census-tables/22slsstab1.xlsx",
            "sha256": digest,
            "created": "2024-10-18",
        },
        "populationSource": "BEA regional CAINC1 line 2, 2023 (data/source/bea-regional); 2022 is not in the repository, so per-resident values divide fiscal 2022 dollars by 2023 residents",
        "scope": "The nation, 50 states and D.C., each as state and local combined, the state alone and local governments alone. Combined values exclude duplicative intergovernmental transfers, so state plus local is more than combined for revenue and spending. A '-' in the table (zero or rounds to zero) is 0 here. The territories are not in this table and stay UNKNOWN.",
        "lines": {str(line): key for line, key in LINES.items()},
        "places": places,
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"Wrote {OUT.relative_to(ROOT)}: {len(places)} places")


if __name__ == "__main__":
    main()
