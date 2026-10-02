"""Compile Census-tabulated population of each place's crossing SLDs.

2024 SLD block allocations, 2020 block/place assignments, and TIGER POP20
join by the published 15-digit block identifier. No area allocation is used.
Run through the repository storage guard. Raw sources remain in .source-cache.
"""

import argparse
import collections
import csv
import gzip
import hashlib
import io
import json
import struct
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".source-cache/a144"
BEF = "https://www2.census.gov/programs-surveys/decennial/rdo/mapping-files/2025/2024-state-legislative-bef"
BAF = "https://www2.census.gov/geo/docs/maps-data/data/baf2020"
BLOCKS = "https://www2.census.gov/geo/tiger/TIGER2025/TABBLOCK20"
SOURCES = {}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def acquire(url):
    path = CACHE / url.rsplit("/", 1)[1]
    if not path.exists():
        temporary = path.with_suffix(path.suffix + ".partial")
        with urllib.request.urlopen(url, timeout=60) as response, temporary.open("wb") as out:
            while chunk := response.read(1024 * 1024):
                out.write(chunk)
        temporary.replace(path)
    data = path.read_bytes()
    SOURCES[url] = {"url": url, "bytes": len(data), "sha256": sha(data)}
    return path


class RemoteZip(io.RawIOBase):
    """Read only the DBF member; range responses must identify exact bytes."""

    def __init__(self, url):
        self.url = url
        with urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=60) as response:
            self.size = int(response.headers["Content-Length"])
        self.position = 0

    def seekable(self):
        return True

    def readable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=0):
        self.position = offset if whence == 0 else (self.position if whence == 1 else self.size) + offset
        return self.position

    def read(self, size=-1):
        end = self.size if size < 0 else min(self.size, self.position + size)
        if end <= self.position:
            return b""
        request = urllib.request.Request(self.url, headers={"Range": f"bytes={self.position}-{end - 1}"})
        with urllib.request.urlopen(request, timeout=60) as response:
            expected = f"bytes {self.position}-{end - 1}/{self.size}"
            if response.status != 206 or response.headers.get("Content-Range") != expected:
                raise ValueError(f"Unverified range response for {self.url}: {response.status}")
            data = response.read()
        if len(data) != end - self.position:
            raise ValueError("Incomplete source range")
        self.position = end
        return data


def block_population(fips):
    member = f"tl_2025_{fips}_tabblock20.dbf"
    url = f"{BLOCKS}/tl_2025_{fips}_tabblock20.zip"
    cached = CACHE / (member + ".gz")
    metadata = CACHE / (member + ".json")
    if cached.exists() and metadata.exists():
        data = gzip.decompress(cached.read_bytes())
        source = json.loads(metadata.read_text())
        if sha(data) != source["sha256"]:
            raise ValueError("Cached population member hash mismatch")
    else:
        remote = RemoteZip(url)
        with zipfile.ZipFile(remote) as archive:
            info = archive.getinfo(member)
            data = archive.read(info)  # zipfile verifies the publisher's member CRC.
            source = {"url": url, "archiveBytes": remote.size, "member": member,
                      "memberCrc32": f"{info.CRC:08x}", "bytes": len(data), "sha256": sha(data)}
        cached.write_bytes(gzip.compress(data, mtime=0))
        metadata.write_text(json.dumps(source, sort_keys=True) + "\n")
    SOURCES[url] = source
    count, header_length, row_length = struct.unpack_from("<IHH", data, 4)
    fields = {}
    offset = 1
    for start in range(32, header_length - 1, 32):
        descriptor = data[start:start + 32]
        if descriptor[0] == 13:
            break
        name = descriptor[:11].split(b"\0")[0].decode()
        length = descriptor[16]
        fields[name] = (offset, length)
        offset += length
    if not {"GEOID20", "POP20"}.issubset(fields):
        raise ValueError(f"{member} lacks recorded population")
    result = {}
    for ordinal in range(count):
        row = data[header_length + ordinal * row_length:header_length + (ordinal + 1) * row_length]
        if row[:1] == b"*":
            continue
        values = {name: row[start:start + length].decode().strip() for name, (start, length) in fields.items() if name in ("GEOID20", "POP20")}
        block, raw = values["GEOID20"], values["POP20"]
        if len(block) != 15 or not block.isdigit() or not raw.isdigit() or block in result:
            raise ValueError(f"Malformed, missing, or duplicate population: {block}/{raw}")
        result[block] = int(raw)
    return result


def allocation_tables():
    result = {}
    for chamber, label in (("state-lower", "SLDL"), ("state-upper", "SLDU")):
        path = acquire(f"{BEF}/{label.lower()}24.zip")
        with zipfile.ZipFile(path) as archive:
            member = f"National{label}24.txt"
            with archive.open(member) as source:
                if source.readline().decode().strip() != f"GEOID,{label}ST":
                    raise ValueError("Unexpected legislative allocation header")
                for raw in source:
                    block, district = raw.decode().strip().split(",")
                    state = result.setdefault(block[:2], {}).setdefault(chamber, {})
                    if block in state or len(block) != 15 or len(district) != 3:
                        raise ValueError(f"Duplicate or malformed district allocation: {block}/{district}")
                    state[block] = block[:2] + district
    return result


def tie_part_land_areas(populations):
    """Retain measured AREALAND_PART only for existing equal-population joins."""
    tied = {key for key, counts in populations.items()
            if list(counts.values()).count(max(counts.values())) > 1}
    areas = {}
    lock = json.loads((ROOT / "data/source/sld-place-relations/artifact-lock.json").read_text())
    for artifact in lock["artifacts"]:
        raw = (ROOT / artifact["localPath"]).read_bytes()
        if sha(raw) != artifact["bytes"]["sha256"]:
            raise ValueError("Recorded district relationship source hash mismatch")
        chamber = "state-lower" if "sldl" in artifact["localPath"] else "state-upper"
        field = "GEOID_SLDL2024_20" if chamber == "state-lower" else "GEOID_SLDU2024_20"
        for ordinal, row in enumerate(csv.DictReader(io.StringIO(raw.decode("utf-8-sig")), delimiter="|"), 2):
            key = row["GEOID_PLACE_20"] + ":" + chamber
            district = row[field]
            if key not in tied or district not in populations[key]:
                continue
            part = areas.setdefault(key, {})
            if district in part or not row["AREALAND_PART"].isdigit():
                raise ValueError("Duplicate or missing recorded place-part land area")
            part[district] = {"squareMeters": int(row["AREALAND_PART"]),
                              "sourcePath": artifact["localPath"],
                              "sourceSha256": artifact["bytes"]["sha256"],
                              "sourceRow": ordinal,
                              "sourceUrl": artifact["retrieval"]["url"]}
    for key in tied:
        if set(areas.get(key, {})) != set(populations[key]):
            raise ValueError("Incomplete recorded area coverage for population tie")
    return areas


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--states", help="Bounded source intake; comma-separated FIPS")
    parser.add_argument("--out", default=str(ROOT / "src/districts/place-district-population.generated.json"))
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    for report in ("2024_SLDL_BlockSplits.pdf", "2024_SLDU_BlockSplits.pdf"):
        acquire(f"{BEF}/{report}")
    catalog = json.loads((ROOT / "src/districts/place-membership.generated.json").read_text())
    identities = json.loads((ROOT / "src/districts/identities.generated.json").read_text())["records"]
    state_names = {row["stateFips"]: row["stateUsps"] for row in identities}
    wanted = {key: set(value) for key, value in catalog["splitDistrictsByKey"].items()}
    states = sorted({key[:2] for key in wanted})
    if args.states:
        if args.out == str(ROOT / "src/districts/place-district-population.generated.json"):
            raise ValueError("A bounded source intake needs a separate --out; never replace the full catalog.")
        states = sorted(set(args.states.split(",")))
    tables = allocation_tables()
    populations = {}
    for fips in states:
        usps = state_names[fips]
        population = block_population(fips)
        path = acquire(f"{BAF}/BlockAssign_ST{fips}_{usps}.zip")
        counts = collections.defaultdict(collections.Counter)
        with zipfile.ZipFile(path) as archive, archive.open(f"BlockAssign_ST{fips}_{usps}_INCPLACE_CDP.txt") as source:
            if source.readline().decode().strip() != "BLOCKID|PLACEFP":
                raise ValueError("Unexpected place allocation header")
            seen = set()
            for raw in source:
                block, place = raw.decode().strip().split("|")
                if block in seen or block not in population:
                    raise ValueError(f"Duplicate place block or missing population: {block}")
                seen.add(block)
                if not place or place == "99999":
                    continue
                for chamber, districts in tables.get(fips, {}).items():
                    key = f"{fips}{place}:{chamber}"
                    if key not in wanted:
                        continue
                    district = districts.get(block)
                    if district is None:
                        raise ValueError(f"Missing district allocation for {block}/{chamber}")
                    if district in wanted[key]:
                        counts[key][district] += population[block]
                    elif population[block] and not district.endswith("ZZZ"):
                        raise ValueError(f"District allocation outside current crossing: {key}/{district}")
        for key, candidates in wanted.items():
            if key[:2] != fips:
                continue
            if key not in counts:
                raise ValueError(f"No recorded population join for {key}")
            populations[key] = {district: counts[key].get(district, 0) for district in sorted(candidates)}
        print(f"{fips} {usps}: {len(population)} population blocks, {len(counts)} split-place/chamber joins", flush=True)
        del population
    payload = {"format": "ocd-place-district-population/v1", "compilerVersion": "1.0.0", "populationVintage": "census-2020",
               "relationVintage": catalog["relationVintage"], "states": states,
               "note": "Census-tabulated full-block POP20, joined to 2020 place and 2024 SLD allocations. Split blocks follow the state's published data-tabulation district; this does not locate a particular address.",
               "sources": [SOURCES[url] for url in sorted(SOURCES)], "populations": populations,
               "tiePartLandAreas": tie_part_land_areas(populations)}
    Path(args.out).write_text(json.dumps(payload, sort_keys=True, indent=2) + "\n")
    print(f"Wrote {len(populations)} recorded population joins to {args.out}", flush=True)


if __name__ == "__main__":
    main()
