"""When each of today's public schools first appears in the NCES Common Core
of Data, from directory snapshots every five years (1986-87 to 2021-22),
through the Urban Institute's Education Data API (public data; NCES CCD).

Usage: python3 fetch-first-years.py <scratch-dir> <opening-schools.json> <output.json>

Only the derived first year per school id ships; the snapshots stay in the
scratch directory.
"""
import json, os, sys, time, urllib.request

YEARS = [1986, 1991, 1996, 2001, 2006, 2011, 2016, 2021]
API = "https://educationdata.urban.org/api/v1/schools/ccd/directory/{year}/?per_page=10000&page={page}"

def fetch(url):
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=300) as response:
                return json.load(response)
        except Exception as error:  # network hiccups: back off and retry
            time.sleep(2 ** attempt)
            last = error
    raise last

def snapshot(scratch, year):
    path = os.path.join(scratch, f"ccd-{year}-ids.json")
    if os.path.exists(path):
        return set(json.load(open(path)))
    ids, page = set(), 1
    while True:
        data = fetch(API.format(year=year, page=page))
        ids.update(row["ncessch"] for row in data["results"] if row.get("ncessch"))
        if not data.get("next"):
            break
        page += 1
    json.dump(sorted(ids), open(path, "w"))
    print(year, len(ids), flush=True)
    return ids

def main(scratch, schools_path, output):
    schools = json.load(open(schools_path))
    wanted = {row[0] for rows in schools["byGeoid"].values() for row in rows}
    first = {}
    for year in YEARS:
        ids = snapshot(scratch, year)
        for school in wanted & ids:
            first.setdefault(school, year)
    out = {
        "version": "school-first-years-v1",
        "source": {
            "tag": "SOURCED",
            "citation": "NCES Common Core of Data public school directories, school years 1986-87 to 2021-22 every five years, via the Urban Institute Education Data API (https://educationdata.urban.org/api/v1/schools/ccd/directory/{year}/). A school's first year is the first snapshot that lists its NCES id; schools listed in 1986-87 may be older.",
        },
        "snapshots": YEARS,
        "schools": len(wanted),
        "firstYear": {school: first[school] for school in sorted(first)},
    }
    json.dump(out, open(output, "w"), separators=(",", ":"))
    open(output, "a").write("\n")
    print("matched", len(first), "of", len(wanted))

if __name__ == "__main__":
    main(*sys.argv[1:4])
