"""Derives src/core2/data/opening-colleges.json: the degree-granting colleges
in each county (IPEDS directory 2025-26 as packaged in public/education, kinds
from data/research/places/college-kinds.json), so a young adult's enrollment
names a real college near home. Rerun after either source changes."""
import json, os
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
m = json.load(open(os.path.join(root, "public/education/manifest.json")))
chunk = next(c for c in m["chunks"] if c["kind"] == "postsecondary")
rows = json.load(open(os.path.join(root, "public/education", chunk["path"])))
rows = rows["records"]
kinds = {r["id"]: r["kind"] for r in json.load(open(os.path.join(root, "data/research/places/college-kinds.json")))["institutions"]}
latest = {}
for r in rows:
    if r[0] not in latest or r[14] > latest[r[0]][14]:
        latest[r[0]] = r
counties = {}
for r in latest.values():
    iid, kind, name, county, status = r[0], r[1], r[2], r[6], r[8]
    if kind != "postsecondary" or iid not in kinds or not county or status not in ("A", "N", "R"):
        continue
    counties.setdefault(county, []).append([iid, name, "community" if kinds[iid] == "community" else "four-year"])
for v in counties.values():
    v.sort()
research = json.load(open(os.path.join(root, "data/research/education/college-enrollment-2026.json")))
STATES = {"Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA","Colorado":"CO","Connecticut":"CT","Delaware":"DE","District of Columbia":"DC","Florida":"FL","Georgia":"GA","Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY","Puerto Rico":"PR","Guam":"GU","U.S. Virgin Islands":"VI","American Samoa":"AS","Northern Mariana Islands":"MP"}
enr = research["enrollment18to24"]
def share_of(v):
    return v.get("share") if isinstance(v, dict) else v
by_state = {STATES[k]: round(share_of(v), 4) for k, v in enr["byState"].items() if k in STATES and share_of(v) is not None}
national = share_of(enr["national"])
src = enr.get("source", {})
out = {
    "version": "opening-colleges-v1",
    "citation": "Degree-granting colleges by county: NCES IPEDS institutional directory 2025-26 (public/education postsecondary catalog), active institutions classified in data/research/places/college-kinds.json; community colleges apart from four-year colleges.",
    "shareCitation": "Share of residents aged 18-24 enrolled in college or graduate school by state: " + (src.get("title", "") + " " + str(src.get("table", src.get("table_id", ""))) + " " + str(src.get("year", ""))).strip() + " (data/research/education/college-enrollment-2026.json); the national share where a state has none.",
    "minimumAge": 18,
    "maximumAge": 24,
    "termStart": "08-25",
    "nationalShare": round(national, 4),
    "shareByState": dict(sorted(by_state.items())),
    "counties": dict(sorted(counties.items())),
}
json.dump(out, open(os.path.join(root, "src/core2/data/opening-colleges.json"), "w"), separators=(",", ":"))
print(len(counties), "counties", sum(len(v) for v in counties.values()), "colleges")
