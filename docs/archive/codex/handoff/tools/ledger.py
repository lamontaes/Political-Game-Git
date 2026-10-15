"""The one central record for the docket. Every fact goes in here once; build.py derives the rest
(All updates, Merged list and cards, Rulings and cards, Audit statuses, the Project numbers).

Usage (the time is always the real clock, never typed):
  python3 ledger.py merge 1580 --team "Team 8" --step AUD8 --title "..." --adds "..." [--audit A152=partly ...] [--update "..."]
  python3 ledger.py ruling --title "..." --detail "..." [--audit A135=owner:Standby Claude Team 5]
  python3 ledger.py update "plain sentence for All updates"
  python3 ledger.py audit A47=done --evidence "..." [--pr 1440]
"""
import argparse, datetime, json, os, subprocess, sys

H = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(H, "ledger.jsonl")


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def add(entry):
    entry = {"ts": now(), **entry}
    with open(PATH, "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print("ledger:", entry["kind"], entry.get("pr") or entry.get("title") or entry.get("text", "")[:60])


def audit_args(vals):
    out = []
    for v in vals or []:
        k, _, rest = v.partition("=")
        if rest.startswith("owner:"): out.append({"id": k, "owner": rest[6:]})
        else: out.append({"id": k, "status": rest})
    return out


def main():
    p = argparse.ArgumentParser(); s = p.add_subparsers(dest="kind", required=True)
    m = s.add_parser("merge"); m.add_argument("pr"); m.add_argument("--team", required=True); m.add_argument("--step", required=True)
    m.add_argument("--title", required=True); m.add_argument("--adds", required=True); m.add_argument("--audit", nargs="*"); m.add_argument("--evidence"); m.add_argument("--update")
    r = s.add_parser("ruling"); r.add_argument("--title", required=True); r.add_argument("--detail", required=True); r.add_argument("--audit", nargs="*")
    u = s.add_parser("update"); u.add_argument("text")
    a = s.add_parser("audit"); a.add_argument("set", nargs="+"); a.add_argument("--evidence"); a.add_argument("--pr", type=int)
    x = p.parse_args()
    if x.kind == "merge":
        # Never record a merge GitHub doesn't show: a piped merge.sh once hid a refused merge.
        st = subprocess.run(["gh", "pr", "view", x.pr.lstrip("#"), "--repo", "lamontaes/Political-Game-Git", "--json", "state,baseRefName",
                             "--jq", '.state + " " + .baseRefName'], capture_output=True, text=True).stdout.strip()
        if st != "MERGED main":
            sys.exit(f"REFUSED: #{x.pr.lstrip('#')} is '{st}', not merged into main; nothing recorded")
        add({"kind": "merge", "pr": "#" + x.pr.lstrip("#"), "team": x.team, "step": x.step, "title": x.title, "adds": x.adds,
             "audit": audit_args(x.audit), "evidence": x.evidence, "update": x.update})
    elif x.kind == "ruling":
        add({"kind": "ruling", "title": x.title, "detail": x.detail, "audit": audit_args(x.audit)})
    elif x.kind == "update":
        add({"kind": "update", "text": x.text})
    elif x.kind == "audit":
        add({"kind": "audit", "audit": audit_args(x.set), "evidence": x.evidence, "pr": x.pr})


if __name__ == "__main__":
    main()
