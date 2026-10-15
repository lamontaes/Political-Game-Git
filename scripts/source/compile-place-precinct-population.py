"""Join Census 2020 block/place/VTD assignments to recorded block POP20.

Uses the existing district population compiler's verified archive/DBF reader.
VTDs are tabulation geography, not proof of any resident's street address.
Run through the storage guard; raw inputs remain in .source-cache.
"""
import argparse
import collections
import importlib.util
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("district_population", Path(__file__).with_name("compile-place-district-population.py"))
district_population = importlib.util.module_from_spec(spec)
spec.loader.exec_module(district_population)
district_population.CACHE = ROOT / ".source-cache/election-precincts"


def table(archive, member, header):
    with archive.open(member) as source:
        if source.readline().decode().strip() != header:
            raise ValueError(f"Unexpected allocation header: {member}")
        seen = set()
        for raw in source:
            fields = raw.decode().strip().split("|")
            block = fields[0]
            if len(fields) != len(header.split("|")) or len(block) != 15 or not block.isdigit() or block in seen:
                raise ValueError(f"Malformed or duplicate allocation: {member}/{block}")
            seen.add(block)
            yield fields


def join_precinct_populations(archive, prefix, population):
    """One block is counted once; missing population cannot become zero."""
    places = {block: place for block, place in table(archive, prefix + "_INCPLACE_CDP.txt", "BLOCKID|PLACEFP")}
    if prefix + "_VTD.txt" not in archive.namelist():
        return {}, {"vtdCount": None, "population": None, "meanPopulation": None,
                    "unassignedPopulation": None, "coverage": "vtd-member-not-published"}
    by_place = collections.defaultdict(collections.Counter)
    by_vtd = collections.Counter()
    unassigned_population = 0
    for block, county, district in table(archive, prefix + "_VTD.txt", "BLOCKID|COUNTYFP|DISTRICT"):
        if block not in population or block not in places:
            raise ValueError(f"Missing recorded block population/place assignment: {block}")
        count = population[block]
        if not isinstance(count, int) or count < 0:
            raise ValueError(f"Invalid population: {block}")
        if not district or district == "ZZZZZZ":
            unassigned_population += count
            continue
        if len(county) != 3 or not county.isdigit() or len(district) != 6:
            raise ValueError(f"Malformed VTD identity: {county}/{district}")
        geoid = block[:2] + county + district
        by_vtd[geoid] += count
        place = places[block]
        if place and place != "99999":
            if len(place) != 5 or not place.isdigit():
                raise ValueError(f"Malformed place identity: {place}")
            by_place[block[:2] + place + ":voting-precinct"][geoid] += count
    populated = {key: value for key, value in by_vtd.items() if value > 0}
    return dict(by_place), {
        "vtdCount": len(populated),
        "population": sum(populated.values()),
        "meanPopulation": sum(populated.values()) / len(populated) if populated else None,
        "unassignedPopulation": unassigned_population,
        "coverage": "published-vtd-block-assignments",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--states", help="Comma-separated FIPS source intake; omitted compiles available state identities")
    parser.add_argument("--out", default=str(ROOT / "src/districts/place-precinct-population.generated.json"))
    args = parser.parse_args()
    if args.states and args.out == str(ROOT / "src/districts/place-precinct-population.generated.json"):
        raise ValueError("Bounded intake needs a separate --out; never overwrite the full catalog")
    identities = json.loads((ROOT / "src/districts/identities.generated.json").read_text())["records"]
    names = {row["stateFips"]: row["stateUsps"] for row in identities}
    states = sorted(args.states.split(",") if args.states else names)
    if not set(states).issubset(names):
        raise ValueError("Source intake requires existing canonical state identities")
    district_population.CACHE.mkdir(parents=True, exist_ok=True)
    populations, averages = {}, {}
    for fips in states:
        usps = names[fips]
        prefix = f"BlockAssign_ST{fips}_{usps}"
        path = district_population.acquire(f"{district_population.BAF}/{prefix}.zip")
        recorded = district_population.block_population(fips)
        with zipfile.ZipFile(path) as archive:
            counts, average = join_precinct_populations(archive, prefix, recorded)
        populations.update(counts)
        averages[fips] = average
        print(f"{usps}: {len(counts)} place joins, {average['vtdCount']} populated VTDs; {average['coverage']}", flush=True)
    payload = {
        "format": "ocd-place-precinct-population/v1", "compilerVersion": "1.0.0",
        "populationVintage": "census-2020", "relationVintage": "census-2020",
        "states": states, "stateAverages": averages,
        "note": "Census-tabulated full-block POP20 joined to 2020 place and voting-district allocations. Does not locate a resident's street address; missing state/place coverage requires an explicitly estimated membership plan.",
        "sources": [district_population.SOURCES[url] for url in sorted(district_population.SOURCES)],
        "populations": populations,
    }
    Path(args.out).write_text(json.dumps(payload, sort_keys=True, indent=2) + "\n")


if __name__ == "__main__":
    main()
