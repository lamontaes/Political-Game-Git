#!/usr/bin/env python3
"""
Per-place commuting shares from LEHD LODES8 (origin-destination, all jobs, JT00).

For every Census place it counts primary jobs (S000) by where the worker lives
and where the job is, then writes data/source/lodes-commuting/place-commuting.json:

  liveWork   residents of the place whose job is in the same place
  liveOut    residents of the place whose job is outside it (another place,
             unincorporated land, or another state)
  workIn     jobs in the place held by people who live outside it

Blocks that belong to no place (stplc 9999999) are outside every place. The
latest year LODES publishes for each state is used; the vintage is recorded.
Run: python3 scripts/source/lodes-commuting.py  (needs the network; ~1 GB of
downloads, streamed and not kept).
"""
import csv, gzip, hashlib, io, json, os, re, sys, urllib.request
from concurrent.futures import ProcessPoolExecutor

BASE = "https://lehd.ces.census.gov/data/lodes/LODES8"
OUT = "data/source/lodes-commuting/place-commuting.json"
NO_PLACE = "9999999"


def fetch(url):
    last = None
    for _ in range(4):
        try:
            return urllib.request.urlopen(url, timeout=300)
        except Exception as error:  # noqa: BLE001
            last = error
    raise last


def listing(url):
    try:
        return fetch(url).read().decode("utf8", "replace")
    except Exception:  # noqa: BLE001
        return ""


def states():
    return sorted(set(re.findall(r'href="([a-z]{2})/"', listing(BASE + "/"))) - {"us"})


def latest_year(st):
    years = sorted({int(y) for y in re.findall(rf"{st}_od_main_JT00_(\d{{4}})\.csv\.gz", listing(f"{BASE}/{st}/od/"))})
    return years[-1] if years else None


def place_of_block(st):
    """Block geocode -> 7-digit place code, for one state."""
    out = {}
    with gzip.open(fetch(f"{BASE}/{st}/{st}_xwalk.csv.gz"), "rt", newline="") as handle:
        reader = csv.reader(handle)
        head = next(reader)
        block, place = head.index("tabblk2020"), head.index("stplc")
        for row in reader:
            if row[place] != NO_PLACE:
                out[row[block]] = row[place]
    return out


BLOCKS = {}  # set before the pool forks, so workers share it


def count(args):
    st, year, kind = args
    blocks = BLOCKS
    live_work, live_out, work_in = {}, {}, {}
    url = f"{BASE}/{st}/od/{st}_od_{kind}_JT00_{year}.csv.gz"
    with gzip.open(fetch(url), "rt", newline="") as handle:
        reader = csv.reader(handle)
        head = next(reader)
        w, h, s = head.index("w_geocode"), head.index("h_geocode"), head.index("S000")
        for row in reader:
            jobs = int(row[s])
            wp, hp = blocks.get(row[w]), blocks.get(row[h])
            if hp:
                if wp == hp:
                    live_work[hp] = live_work.get(hp, 0) + jobs
                else:
                    live_out[hp] = live_out.get(hp, 0) + jobs
            if wp and wp != hp:
                work_in[wp] = work_in.get(wp, 0) + jobs
    return live_work, live_out, work_in


def spread(doc):
    """The 10th to 90th percentile of the live-work and work-in shares over places with 100+ jobs."""
    lw, wi = [], []
    for live_work, live_out, work_in in doc["places"].values():
        if live_work + live_out >= 100:
            lw.append(live_work / (live_work + live_out))
        if live_work + work_in >= 100:
            wi.append(work_in / (live_work + work_in))
    def band(values):
        values.sort()
        return [round(values[int(len(values) * 0.1)], 4), round(values[int(len(values) * 0.9)], 4)]
    avg = doc["nationalAverage"]
    avg["liveWorkShareSpread"] = band(lw)
    avg["workInShareSpread"] = band(wi)
    avg["spreadNote"] = "10th to 90th percentile across places with at least 100 jobs"


def write(doc):
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    text = json.dumps(doc, separators=(",", ":"), sort_keys=True)
    with open(OUT, "w") as handle:
        handle.write(text + "\n")
    return text


def main():
    if "--spread-only" in sys.argv:
        doc = json.load(open(OUT))
        spread(doc)
        write(doc)
        return
    sts = states()
    years = {st: latest_year(st) for st in sts}
    sts = [st for st in sts if years[st]]
    # Home blocks of any state appear in another state's aux file: one map of all.
    for st in sts:
        BLOCKS.update(place_of_block(st))
        print("xwalk", st, len(BLOCKS), file=sys.stderr, flush=True)
    jobs = [(st, years[st], kind) for st in sts for kind in ("main", "aux")]
    total = {"liveWork": {}, "liveOut": {}, "workIn": {}}
    with ProcessPoolExecutor(max_workers=4) as pool:
        for (st, _, kind), result in zip(jobs, pool.map(count, jobs)):
            for name, part in zip(("liveWork", "liveOut", "workIn"), result):
                for place, n in part.items():
                    total[name][place] = total[name].get(place, 0) + n
            print("od", st, kind, file=sys.stderr, flush=True)
    places = sorted(set().union(*[set(v) for v in total.values()]))
    table = {p: [total["liveWork"].get(p, 0), total["liveOut"].get(p, 0), total["workIn"].get(p, 0)] for p in places}
    sums = [sum(v[i] for v in table.values()) for i in range(3)]
    doc = {
        "source": {
            "name": "LEHD Origin-Destination Employment Statistics (LODES8), all jobs (JT00), main and aux files",
            "url": BASE + "/",
            "citation": "U.S. Census Bureau, Longitudinal Employer-Household Dynamics, LODES version 8",
            "rights": "public-domain-us-government",
            "vintageByState": {st: years[st] for st in sts},
        },
        "columns": ["liveWork", "liveOut", "workIn"],
        "nationalAverage": {
            "tag": "ESTIMATED",
            "citation": "Sum over all places in this table",
            "liveWorkShareOfResidents": sums[0] / (sums[0] + sums[1]),
            "workInShareOfJobs": sums[2] / (sums[0] + sums[2]),
        },
        "places": table,
    }
    spread(doc)
    text = write(doc)
    print("wrote", OUT, len(places), "places", hashlib.sha256(text.encode()).hexdigest(), file=sys.stderr)


if __name__ == "__main__":
    main()
