"""Derives src/core2/data/views/ces-2024-party.json from the CES 2024 Common
Content (CC0, Harvard Dataverse doi:10.7910/DVN/X11EP6): the weighted share of
each seven-point party identification (pid7) at each self-placed ideology
(ideo5), national, and the mean ideology of each party group. The microdata
stays out of the repository; only these shares ship.

    python3 -I data/research/views/derive-ces-2024-party.py <ces24.csv>
"""
import csv, json, os, sys
from collections import defaultdict

PID7 = {"1": "strong-democrat", "2": "weak-democrat", "3": "lean-democrat", "4": "independent",
        "5": "lean-republican", "6": "weak-republican", "7": "strong-republican", "8": "not-sure"}
IDEO5 = {"1": -2, "2": -1, "3": 0, "4": 1, "5": 2}

w = defaultdict(float)
lean_sum = defaultdict(float)
lean_w = defaultdict(float)
with open(sys.argv[1], newline="", encoding="latin-1") as handle:
    for row in csv.DictReader(handle):
        try:
            weight = float(row["commonweight"])
        except ValueError:
            continue
        pid = PID7.get(row["pid7"])
        if not pid:
            continue
        ideo = row["ideo5"]
        if ideo in IDEO5:
            w[(IDEO5[ideo], pid)] += weight
            lean_sum[pid] += weight * IDEO5[ideo]
            lean_w[pid] += weight
        elif ideo == "6":
            w[("not-sure", pid)] += weight
out = {
    "version": "ces-2024-party-v1",
    "source": {
        "tag": "SOURCED",
        "citation": "Cooperative Election Study 2024 Common Content (CC0; Harvard Dataverse doi:10.7910/DVN/X11EP6), 60,000 adults weighted by commonweight: seven-point party identification (pid7) by self-placed ideology (ideo5); leaners are kept as their own points.",
    },
    "parties": list(PID7.values()),
    "byIdeology": {},
    "meanLeanByParty": {pid: round(lean_sum[pid] / lean_w[pid], 4) for pid in PID7.values() if lean_w[pid]},
}
for ideo in [-2, -1, 0, 1, 2, "not-sure"]:
    total = sum(w[(ideo, pid)] for pid in PID7.values())
    out["byIdeology"][str(ideo)] = {pid: round(w[(ideo, pid)] / total, 4) for pid in PID7.values()}
target = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "core2", "data", "views", "ces-2024-party.json")
with open(target, "w") as handle:
    json.dump(out, handle, indent=2)
    handle.write("\n")
print(json.dumps(out["meanLeanByParty"]))
