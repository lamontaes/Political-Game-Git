"""The docket's % and time estimate, measured from the audit itself (Oct 1, 2:50 p.m. owner request:
"a time update on the % thing and a dynamic time estimator").

At each build: run `npm run audit:scan` on current main in its own worktree (about 5 seconds), keep one history
row per build in scan-history.jsonl, and derive:
  pct        = (items done + half of items partly done) / 149, as the scan reads main right now
  pace       = audit checks newly passing per hour over the last 2 hours (falls back to the ledger's item
               points when the history is shorter than 30 minutes)
  hours left = checks still failing / pace
All times come from the real clock.
"""
import datetime, json, os, subprocess

H = os.path.dirname(os.path.abspath(__file__))
WT = "/tmp/wt-audit-r"
HIST = os.path.join(H, "scan-history.jsonl")
P = {"done": 1, "partly": 0.5}
WINDOW_H = 2


def now():
    return datetime.datetime.now(datetime.timezone.utc)


def scan():
    """Scan current main. Returns the scan result dict, or None if the scan can't run."""
    try:
        if not os.path.isdir(WT):
            subprocess.run(["git", "-C", "/Users/lamontae/Documents/PG-LAND", "worktree", "add", "-f", "--detach", WT, "origin/main"], capture_output=True)  # /tmp is wiped on reboot; PG-LAND survives
            if not os.path.exists(os.path.join(WT, "node_modules")):
                os.symlink("/Users/lamontae/Documents/PG-LAND/node_modules", os.path.join(WT, "node_modules"))
        subprocess.run(["git", "-C", WT, "fetch", "-q", "origin", "main"], capture_output=True, timeout=60)
        subprocess.run(["git", "-C", WT, "checkout", "-q", "--detach", "origin/main"], capture_output=True, timeout=60)
        r = subprocess.run(["npm", "run", "-s", "audit:scan"], cwd=WT, capture_output=True, text=True, timeout=120)
        if r.returncode != 0: return None
        res = json.load(open(os.path.join(WT, "scripts/audit/scan-result.json")))
        res["_main"] = subprocess.run(["git", "-C", WT, "rev-parse", "--short=9", "HEAD"], capture_output=True, text=True).stdout.strip()
        return res
    except Exception:
        return None


def summarize(res):
    items = [i for e in res["engines"] for i in e["items"]]
    passed = sum(i.get("passed", 0) for i in items)
    total = sum(len(i.get("checks", [])) for i in items)
    st = res["counts"]["scanned"]
    return {"ts": now().strftime("%Y-%m-%dT%H:%M:%SZ"), "main": res.get("_main", ""), "items": len(items),
            "done": st.get("done", 0), "partly": st.get("partly", 0), "notStarted": st.get("not-started", 0),
            "unknown": st.get("unknown", 0), "checksPassed": passed, "checksTotal": total,
            "points": st.get("done", 0) + 0.5 * st.get("partly", 0)}


def history():
    out = []
    try:
        for line in open(HIST): out.append(json.loads(line))
    except FileNotFoundError:
        pass
    return out


def rate(hist, key, hours):
    """Gain in `key` per hour over the last `hours`, from the history. None if under 30 minutes of history."""
    t = now(); cut = t - datetime.timedelta(hours=hours)
    win = [h for h in hist if datetime.datetime.fromisoformat(h["ts"].replace("Z", "+00:00")) >= cut]
    older = [h for h in hist if datetime.datetime.fromisoformat(h["ts"].replace("Z", "+00:00")) < cut]
    if older: win = [older[-1]] + win  # measure from the last reading before the window
    if len(win) < 2: return None
    a, b = win[0], win[-1]
    span = (datetime.datetime.fromisoformat(b["ts"].replace("Z", "+00:00")) - datetime.datetime.fromisoformat(a["ts"].replace("Z", "+00:00"))).total_seconds() / 3600
    if span < 0.5: return None
    return (b[key] - a[key]) / span, span


def ledger_points_rate(hours):
    """Fallback pace: audit item points gained per hour in the ledger over the last `hours`."""
    base = {i["id"]: i["status"] for i in json.load(open(os.path.join(H, "audit-baseline.json")))}
    cur = dict(base); t = now(); gained = 0.0
    for line in open(os.path.join(H, "ledger.jsonl")):
        e = json.loads(line)
        for x in e.get("audit") or []:
            if "status" in x and x["id"] in cur:
                d = P.get(x["status"], 0) - P.get(cur[x["id"]], 0); cur[x["id"]] = x["status"]
                if d and datetime.datetime.fromisoformat(e["ts"].replace("Z", "+00:00")) >= t - datetime.timedelta(hours=hours):
                    gained += d
    return gained / hours


def local_time(dt):
    loc = dt.astimezone(datetime.timezone(datetime.timedelta(hours=-4)))  # Eastern daylight time
    s = loc.strftime("%-I:%M %p").replace("AM", "a.m.").replace("PM", "p.m.")
    day = (loc.date() - now().astimezone(loc.tzinfo).date()).days
    return s + ("" if day == 0 else " tomorrow" if day == 1 else f", {loc.strftime('%a %b %-d')}")


def derive(d):
    R = d["rebuild"]
    res = scan()
    hist = history()
    if res:
        row = summarize(res)
        if not hist or hist[-1].get("main") != row["main"] or hist[-1].get("checksPassed") != row["checksPassed"]:
            with open(HIST, "a") as f: f.write(json.dumps(row) + "\n")
            hist.append(row)
    if not hist: return
    cur = hist[-1]
    A = {"items": cur["items"], "done": cur["done"], "partly": cur["partly"], "notStarted": cur["notStarted"],
         "unknown": cur["unknown"], "checksPassed": cur["checksPassed"], "checksTotal": cur["checksTotal"],
         "main": cur["main"], "scannedAt": local_time(datetime.datetime.fromisoformat(cur["ts"].replace("Z", "+00:00")))}
    A["pct"] = round(100 * cur["points"] / cur["items"], 1)
    left = cur["checksTotal"] - cur["checksPassed"]
    A["checksLeft"] = left
    rates = {}
    for h in (1, 2, 4):
        r = rate(hist, "checksPassed", h)
        if r: rates[f"{h}h"] = {"perHour": round(r[0], 1), "span": round(r[1], 1)}
    A["rates"] = rates
    main_rate = rates.get(f"{WINDOW_H}h") or rates.get("1h")
    if main_rate and main_rate["perHour"] > 0:
        A["basis"] = "checks"; A["perHour"] = main_rate["perHour"]
        hrs = left / main_rate["perHour"]
    else:
        # Not enough scan history yet: item points from the ledger over the last 2 hours.
        pr = ledger_points_rate(WINDOW_H)
        A["basis"] = "items"; A["perHour"] = round(pr, 2)
        hrs = (cur["items"] - cur["points"]) / pr if pr > 0 else None
    if hrs is not None:
        A["leftHours"] = round(hrs, 1)
        A["finishAt"] = local_time(now() + datetime.timedelta(hours=hrs))
    R["auditProgress"] = A
    slice_progress(d, res)
    task_counter(d, res)
    # The Now ring and estimate read the audit from here on (owner, Oct 1: everything revolves around the audit).
    R["pct"] = A["pct"]; R["stepsDone"] = A["done"]; R["stepsTotal"] = A["items"]
    R["leftHours"] = A.get("leftHours"); R["finishAt"] = A.get("finishAt")
    R.pop("nextCheck", None)


# Owner, Oct 1 4:31 p.m.: each slice's % counts everyone's work (Codex and Claude), read live from main.
SLICE_OF_OWNER = {"team 3": 1, "team 4": 2, "team 6": 3, "team 1": 4, "team 2": 5, "team 9": 6,
                  "cloud c (elections)": 7, "team 8": 8, "team 7": 9, "team 5": 10, "standby claude team 5": 10}
# Support owners (Audit/Systems, Coordinator, Sonnet lanes) count toward the slice their engine feeds.
SLICE_OF_ENGINE = [9, 4, 1, 7, 10, 8]


def slice_progress(d, res):
    S = (d.get("slices") or {}).get("slices") or []
    if not res or not S: return
    agg = {x["n"]: {"items": 0, "done": 0, "partly": 0, "passed": 0, "checks": 0} for x in S}
    for ei, e in enumerate(res["engines"]):
        for i in e["items"]:
            n = SLICE_OF_OWNER.get((i.get("owner") or "").strip().lower()) or SLICE_OF_ENGINE[min(ei, len(SLICE_OF_ENGINE) - 1)]
            a = agg.get(n)
            if not a: continue
            c = i.get("checks", 0); c = len(c) if isinstance(c, list) else (c or 0)
            a["items"] += 1; a["passed"] += i.get("passed", 0) or 0; a["checks"] += c
            st = i.get("scanned") or i.get("verified")
            if st == "done": a["done"] += 1
            elif st == "partly": a["partly"] += 1
    for x in S:
        a = agg[x["n"]]; x.update(a)
        x["pct"] = round(100 * a["passed"] / a["checks"]) if a["checks"] else None


# Owner, Oct 1 6:57 p.m.: a literal task counter toward the finish line. tasks.json holds every open task
# (team, order, gate). A task is closed when the live scan reads its audit item as done on main.
def task_counter(d, res):
    try:
        T = json.load(open(os.path.join(H, "tasks.json")))
    except Exception:
        return
    status, checks = {}, {}
    if res:
        for e in res["engines"]:
            for i in e["items"]:
                status[i["id"]] = i.get("scanned") or i.get("verified")
                c = i.get("checks", 0); c = len(c) if isinstance(c, list) else (c or 0)
                checks[i["id"]] = (i.get("passed", 0) or 0, c)
    by = {}
    open_n = 0
    for t in T["tasks"]:
        done = status.get(t["id"]) == "done"
        row = by.setdefault(t["team"], {"team": t["team"], "open": 0, "done": 0, "next": None, "passed": 0, "checks": 0})
        ps, cs = checks.get(t["id"], (0, 0)); row["passed"] += ps; row["checks"] += cs
        if done:
            row["done"] += 1
        else:
            row["open"] += 1; open_n += 1
            if row["next"] is None: row["next"] = t["id"] + " " + t["goal"]
    for r in by.values():
        r["checksLeft"] = r["checks"] - r["passed"]
        r["pct"] = round(100 * r["passed"] / r["checks"]) if r["checks"] else None
    d["rebuild"]["taskCounter"] = {"start": len(T["tasks"]), "open": open_n, "closed": len(T["tasks"]) - open_n,
                                   "since": T.get("generated", ""), "teams": sorted(by.values(), key=lambda r: r["checksLeft"])}
