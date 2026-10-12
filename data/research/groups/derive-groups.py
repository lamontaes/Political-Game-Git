"""Derives src/core2/data/groups/counts.json: how many of each kind of local
group a county (and a named city) has, from the IRS Exempt Organizations
Business Master File (public domain, https://www.irs.gov/charities-non-profits/
exempt-organizations-business-master-file-extract-eo-bmf), by NTEE code, with
each organization's ZIP placed in a county by the Census 2020 ZCTA-to-county
relationship file (the county holding most of the ZIP's land).

    python3 -I data/research/groups/derive-groups.py <download-dir>

The download directory holds eo_<state>.csv for the 50 states, D.C. and
Puerto Rico, eo_xx.csv (other areas, which lists the other territories) and
tab20_zcta520_county20_natl.txt. Only derived counts ship.
"""
import csv, json, os, sys
from collections import Counter, defaultdict

# Kinds of local group by NTEE code prefix (National Center for Charitable
# Statistics, NTEE Core Codes). Longest prefix wins.
KINDS = {
    "S80": "service-club",  # Service clubs (Rotary, Lions, Kiwanis)
    "S81": "service-club",
    "S82": "service-club",
    "W30": "veterans-post",  # Military and veterans organizations
    "B94": "parent-teacher-group",  # Parent-teacher groups
    "S22": "neighborhood-association",  # Neighborhood and block associations
    "N6": "sports-league",  # Amateur sports clubs, leagues and competitions
    "N40": "sports-league",
    "T40": "volunteer-group",  # Voluntarism promotion
    "M24": "volunteer-group",  # Volunteer fire departments
    "X2": "congregation",  # Christian congregations
    "X3": "congregation",  # Jewish
    "X4": "congregation",  # Islamic
    "X5": "congregation",  # Buddhist
    "X7": "congregation",  # Hindu
    "X8": "congregation",  # Other religions
    "Y42": "fraternal-society",  # Domestic fraternal societies (Elks, Moose)
    "Y40": "fraternal-society",
    "S41": "business-association",  # Chambers of commerce
    "R40": "advocacy-group",  # Voter education, civil rights advocacy
    "W24": "advocacy-group",  # Citizen participation
    "A6": "arts-group",  # Performing arts groups (community theater, choirs)
}
TERRITORIES = {"GU", "VI", "AS", "MP"}


def kind_of(ntee):
    for size in (3, 2):
        if ntee[:size] in KINDS:
            return KINDS[ntee[:size]]
    return None


def main(folder):
    # Each ZIP's county: where most of its people lived (Census 2010 file,
    # population in each piece), else for ZIPs created since, most of its
    # land (Census 2020 file).
    zcta = {}
    best = {}
    population = {}
    with open(os.path.join(folder, "zcta_county_rel_10.txt"), encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            z, county = row["ZCTA5"], row["GEOID"]
            population[county] = int(row["COPOP"] or 0)
            people = int(row["POPPT"] or 0)
            if people > best.get(z, -1):
                best[z] = people
                zcta[z] = county
    land_best = {}
    land_county = {}
    with open(os.path.join(folder, "tab20_zcta520_county20_natl.txt"), encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle, delimiter="|"):
            z, county = row["GEOID_ZCTA5_20"], row["GEOID_COUNTY_20"]
            if not z or not county:
                continue
            land = int(row["AREALAND_PART"] or 0)
            if land > land_best.get(z, -1):
                land_best[z] = land
                land_county[z] = county
    for z, county in land_county.items():
        zcta.setdefault(z, county)
    counties = defaultdict(Counter)
    cities = defaultdict(Counter)
    states = defaultdict(Counter)
    cityCounties = defaultdict(Counter)
    unplaced = []
    seen = 0
    for name in sorted(os.listdir(folder)):
        if not (name.startswith("eo_") and name.endswith(".csv")):
            continue
        with open(os.path.join(folder, name), newline="", encoding="latin-1") as handle:
            for row in csv.DictReader(handle):
                state = row["STATE"].strip()
                if name == "eo_xx.csv" and state not in TERRITORIES:
                    continue
                # Status 01: unconditional exemption, currently recognized.
                if row["STATUS"].strip() not in ("01", "1"):
                    continue
                kind = kind_of(row["NTEE_CD"].strip())
                if not kind:
                    continue
                seen += 1
                states[state][kind] += 1
                cities[f"{state}|{row['CITY'].strip().upper()}"][kind] += 1
                city = f"{state}|{row['CITY'].strip().upper()}"
                county = zcta.get(row["ZIP"].strip()[:5])
                if county:
                    counties[county][kind] += 1
                    cityCounties[city][county] += 1
                else:
                    # A post-office-box ZIP has no ZIP area: placed below by its city.
                    unplaced.append((city, kind))
    # Each unplaced organization goes to the county where most of its city's
    # placed organizations are.
    for city, kind in unplaced:
        if cityCounties[city]:
            counties[cityCounties[city].most_common(1)[0][0]][kind] += 1
    out = {
        "version": "groups-counts-v1",
        "source": {
            "tag": "SOURCED",
            "citation": "IRS Exempt Organizations Business Master File extract (eo_<state>.csv and eo_xx.csv, retrieved 2026-10-12; organizations with status 01, currently recognized), counted by NTEE Core Code (National Center for Charitable Statistics); counties from each organization's ZIP by the Census ZCTA-to-county relationship files (the county where most of the ZIP's people lived in 2010, else most of its land in 2020); an organization at a post-office-box ZIP takes the county where most of its city's other organizations are. Churches need not register with the IRS, so congregations are a floor. County populations are the 2010 census counts in the same relationship file.",
        },
        "kinds": sorted(set(KINDS.values())),
        "byState": {k: dict(sorted(v.items())) for k, v in sorted(states.items())},
        "byCounty": {k: dict(sorted(v.items())) for k, v in sorted(counties.items())},
        "byCity": {k: dict(sorted(v.items())) for k, v in sorted(cities.items())},
        # Each county's 2010 census population (the relationship file's COPOP),
        # to turn a county's count into groups per resident.
        "countyPopulation2010": dict(sorted(population.items())),
    }
    target = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "core2", "data", "groups", "counts.json")
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "w") as handle:
        json.dump(out, handle, separators=(",", ":"))
        handle.write("\n")
    print(seen, "groups;", len(counties), "counties;", len(cities), "cities;", len(states), "states")


if __name__ == "__main__":
    main(sys.argv[1])
