"""Export what each state's and each state's local governments' charges and
miscellaneous revenue are for, from the Census 2022 public-use finance file.

Reads data/source/government-finances/census-tables/22statetypepu.txt (the
Census Bureau's 2022 state-by-level estimates, Census of Governments: Finance,
a full count; SHA-256 below) and writes data/research/money/service-charges-2022.json:
for the nation, each state and D.C., and for state government alone and local
governments alone, the share of current charges by service (education,
hospitals, highways, sewerage and solid waste, parks, and so on) and of
miscellaneous general revenue by kind (interest earnings, fines, sales of
property, special assessments, and so on). Utilities, liquor stores and
insurance trusts are not general revenue and are left out, as in
data/research/money/public-budget-bases.json. The territories are not in the
file: they carry the nation's shares, labeled ESTIMATED.

Run: python3 scripts/research/export-service-charges-2022.py
"""

import hashlib
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data/source/government-finances/census-tables/22statetypepu.txt"
EXPECTED_SHA256 = "c6b7e9dbbe6db22b946ee5d278d62e56950073856a550eb9b7f862f515cebd26"
TABLE1 = ROOT / "data/research/money/state-local-finances-2022.json"
BASES = ROOT / "data/research/money/public-budget-bases.json"
OUT = ROOT / "data/research/money/service-charges-2022.json"

# The Census item codes (technical documentation, "Item Codes and Short
# Descriptions") of current charges and of miscellaneous general revenue,
# grouped by the service the money pays for.
CHARGES = {
    "education": ["A09", "A10", "A12", "A16", "A18", "A21"],
    "hospitals": ["A36"],
    "highways-and-tolls": ["A44", "A45"],
    "airports-ports-and-parking": ["A01", "A60", "A87"],
    "parks-and-recreation": ["A61"],
    "sewerage-and-solid-waste": ["A80", "A81"],
    "housing-and-community-development": ["A50"],
    "natural-resources": ["A59"],
    "other-charges": ["A03", "A89"],
}
MISCELLANEOUS = {
    "special-assessments": ["U01"],
    "sale-of-property": ["U11"],
    "interest-earnings": ["U20"],
    "fines-and-forfeits": ["U30"],
    "rents-and-royalties": ["U40", "U41"],
    "private-donations": ["U50"],
    "net-lottery": ["U95"],
    "other-miscellaneous": ["U99"],
}
STATE_FIPS = {
    "00": "US", "01": "US-AL", "02": "US-AK", "04": "US-AZ", "05": "US-AR",
    "06": "US-CA", "08": "US-CO", "09": "US-CT", "10": "US-DE", "11": "US-DC",
    "12": "US-FL", "13": "US-GA", "15": "US-HI", "16": "US-ID", "17": "US-IL",
    "18": "US-IN", "19": "US-IA", "20": "US-KS", "21": "US-KY", "22": "US-LA",
    "23": "US-ME", "24": "US-MD", "25": "US-MA", "26": "US-MI", "27": "US-MN",
    "28": "US-MS", "29": "US-MO", "30": "US-MT", "31": "US-NE", "32": "US-NV",
    "33": "US-NH", "34": "US-NJ", "35": "US-NM", "36": "US-NY", "37": "US-NC",
    "38": "US-ND", "39": "US-OH", "40": "US-OK", "41": "US-OR", "42": "US-PA",
    "44": "US-RI", "45": "US-SC", "46": "US-SD", "47": "US-TN", "48": "US-TX",
    "49": "US-UT", "50": "US-VT", "51": "US-VA", "53": "US-WA", "54": "US-WV",
    "55": "US-WI", "56": "US-WY",
}
LEVELS = {"2": "state", "3": "local"}


def main() -> None:
    raw = SOURCE.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == EXPECTED_SHA256, "source file changed"
    amounts: dict[tuple[str, str], dict[str, int]] = {}
    for line in raw.decode("ascii").splitlines():
        if len(line) < 20:
            continue
        state, level, item, thousands = line[0:2], line[2], line[4:7], int(line[8:20])
        amounts.setdefault((state, level), {})[item] = thousands * 1000

    def split(items: dict[str, int], groups: dict[str, list[str]]) -> dict:
        dollars = {g: sum(items.get(c, 0) for c in codes) for g, codes in groups.items()}
        total = sum(dollars.values())
        # A group that nets below zero (net lottery) is kept as its own dollars
        # but carries no share; shares are of the positive groups and sum to 1.
        positive = {g: max(0, v) for g, v in dollars.items()}
        base = sum(positive.values())
        return {
            "totalDollars": total,
            "dollars": dollars,
            "shares": {g: round(v / base, 6) if base else 0 for g, v in positive.items()},
        }

    table1 = json.loads(TABLE1.read_text())["places"]
    places: dict[str, dict] = {}
    for fips, key in STATE_FIPS.items():
        row: dict = {"tag": "SOURCED"}
        for level_code, level in LEVELS.items():
            items = amounts.get((fips, level_code), {})
            charges = split(items, CHARGES)
            misc = split(items, MISCELLANEOUS)
            check = table1[key]["dollars"][level]
            row[level] = {
                "chargesAndFees": charges,
                "miscellaneous": misc,
                # How the item codes' sum compares with Table 1's own line, so
                # a reader sees how far the two Census products agree (within ten percent in all but ten place-level-line pairs; service-charges-data.test.ts lists them).
                "againstTable1": {
                    "currentCharges": round(charges["totalDollars"] / check["currentCharges"], 4)
                    if check["currentCharges"] else None,
                    "miscellaneousGeneralRevenue": round(
                        misc["totalDollars"] / check["miscellaneousGeneralRevenue"], 4
                    ) if check["miscellaneousGeneralRevenue"] else None,
                },
            }
        places[key] = row
    bases = json.loads(BASES.read_text())["places"]
    states = [k for k in places if k != "US"]

    def spread(level: str, family: str) -> dict:
        """The range of the 50 states' and D.C.'s share for each group."""
        shares = [places[k][level][family]["shares"] for k in states]
        return {g: [min(s[g] for s in shares), max(s[g] for s in shares)] for g in shares[0]}

    for key in sorted(bases):
        if key in places:
            continue
        places[key] = {
            "tag": "ESTIMATED",
            "estimatedFrom": "US",
            "note": "The territories are not in the Census file; the nation's shares stand in, with the range the 50 states and D.C. span for each group as the spread.",
            "state": places["US"]["state"],
            "local": places["US"]["local"],
            "spread": {
                level: {
                    "chargesAndFees": spread(level, "chargesAndFees"),
                    "miscellaneous": spread(level, "miscellaneous"),
                }
                for level in ("state", "local")
            },
        }
    OUT.write_text(
        json.dumps(
            {
                "id": "service-charges-2022",
                "about": "What a government's current charges and miscellaneous general revenue are for, by service and kind, as shares of the dollars; for state government alone and for all local governments in the state together.",
                "source": {
                    "title": "2022 State and Local Government Finances, state by level of estimate (public-use format file)",
                    "publisher": "U.S. Census Bureau, 2022 Census of Governments: Finance",
                    "url": "https://www2.census.gov/programs-surveys/gov-finances/tables/2022/2022_Individual_Unit_File.zip",
                    "file": "data/source/government-finances/census-tables/22statetypepu.txt",
                    "documentation": "data/source/government-finances/census-tables/2022-public-use-technical-documentation.pdf",
                    "sha256": EXPECTED_SHA256,
                },
                "groups": {"chargesAndFees": CHARGES, "miscellaneous": MISCELLANEOUS},
                "script": "scripts/research/export-service-charges-2022.py",
                "places": places,
            },
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    main()
