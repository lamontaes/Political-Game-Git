"""JOLTS turnover by industry and state, and CPS unemployment duration.

Usage: python3 -B data/research/jobs/research.py <raw-dir>
Raw files: download.bls.gov/pub/time.series/jt/jt.data.1.AllItems and
ln/ln.data.1.AllData filtered to LNS13008275, LNS13008276 (retrieved 2026-10-12, not kept).
"""
import json, pathlib, re, sys
import numpy as np
RAW = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(__file__).parent / "series"
ELEMENTS = {"JO": "openings", "HI": "hires", "QU": "quits", "LD": "layoffs"}
INDUSTRY = {"000000": "total", "110099": "mining-logging", "230000": "construction", "300000": "manufacturing", "400000": "trade-transport-utilities", "510000": "information", "510099": "financial", "540099": "professional-business", "600000": "education-health", "700000": "leisure-hospitality", "810000": "other-services", "900000": "government"}
rates = {}
for line in (RAW / "jt.data.1.AllItems").read_text().splitlines()[1:]:
    p = [x.strip() for x in line.split("\t")]
    sid = p[0]
    if len(sid) != 21 or sid[2] != "S" or sid[-1] != "R" or not re.fullmatch(r"M(0[1-9]|1[0-2])", p[2]): continue
    ind, state, area, size, el = sid[3:9], sid[9:11], sid[11:16], sid[16:18], sid[18:20]
    if el not in ELEMENTS or area != "00000" or size != "00": continue
    key = INDUSTRY.get(ind) if state == "00" else (f"state:{state}" if ind == "000000" else None)
    if not key: continue
    rates.setdefault(key, {}).setdefault(ELEMENTS[el], {})[f"{p[1]}-{p[2][1:]}"] = float(p[3])
def summary(series, first, last):
    v = [x for m, x in series.items() if first <= m <= last]
    return {"mean": round(float(np.mean(v)), 3), "p05": round(float(np.percentile(v, 5)), 3), "p95": round(float(np.percentile(v, 95)), 3), "months": len(v)}
out = {"window": "2001-01 to 2019-12 for industries, 2001-01 to 2019-12 for states; monthly rates, percent of employment (openings: of employment plus openings), seasonally adjusted", "industries": {}, "states": {}}
for key, els in sorted(rates.items()):
    target = out["states"] if key.startswith("state:") else out["industries"]
    target[key.replace("state:", "")] = {el: summary(s, "2001-01", "2019-12") for el, s in els.items()}
dur = {}
for line in (RAW / "ln-duration.tsv").read_text().splitlines():
    p = [x.strip() for x in line.split("\t")]
    if re.fullmatch(r"M(0[1-9]|1[0-2])", p[2]) and p[3] not in ("-", ""): dur.setdefault(p[0], {})[f"{p[1]}-{p[2][1:]}"] = float(p[3])
out["unemploymentDurationWeeks"] = {"mean": summary(dur["LNS13008275"], "1990-01", "2019-12"), "median": summary(dur["LNS13008276"], "1990-01", "2019-12"), "series": "CPS LNS13008275 (mean), LNS13008276 (median), 1990-2019"}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "turnover.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps(out["industries"]["total"]), json.dumps(out["unemploymentDurationWeeks"]))
for k in ["construction", "leisure-hospitality", "government", "manufacturing"]: print(k, json.dumps(out["industries"][k]))
print(len(out["states"]))
