"""Build the game's ballot measures from the 2026 research.

Reads data/research/elections/ballot-measures-2026.json (Ballotpedia-sourced
measures and each state's passage rule) and keeps the measures that settle a
recorded policy question, with which way a yes vote settles it. Writes
src/core2/data/elections/ballot-measures.json.

Run: python3 scripts/research/build-ballot-measures.py
"""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data/research/elections/ballot-measures-2026.json"
OUT = ROOT / "src/core2/data/elections/ballot-measures.json"
Q = "us-policy-positions:"

# (state, title) -> (question, what a yes vote does, note on the match)
MAPPING = {
    ("US-CA", "Proposition 39"): ("government-operations.require-photo-id-to-vote", "enact", None),
    ("US-CO", "Amendment 81"): ("justice-public-safety.partner-with-federal-immigration-enforcement", "enact", None),
    ("US-CO", "Amendment 84"): ("government-operations.require-photo-id-to-vote", "enact", "identification on mail ballots"),
    ("US-CO", "Amendment 87"): ("fiscal.graduated-income-tax", "enact", None),
    ("US-ID", "Proposition 1"): ("civil-family-community.restrict-abortion", "repeal", "a statutory right to reproductive freedom"),
    ("US-MA", "Question 4"): ("government-operations.same-day-voter-registration", "enact", None),
    ("US-MA", "Question 8"): ("business-commerce.legalize-cannabis-sales", "repeal", None),
    ("US-MO", "Amendment 3"): ("civil-family-community.restrict-abortion", "enact", None),
    ("US-MO", "Amendment 5"): ("fiscal.adopt-income-tax", "repeal", "phases out the individual income tax"),
    ("US-NC", "Require Voter Identification Amendment"): ("government-operations.require-photo-id-to-vote", "enact", None),
    ("US-NV", "Question 6"): ("civil-family-community.restrict-abortion", "repeal", "a constitutional right before viability"),
    ("US-NV", "Question 7"): ("government-operations.require-photo-id-to-vote", "enact", None),
    ("US-OK", "State Question 832"): ("labor-workforce.raise-minimum-wage", "enact", "$15.00 an hour"),
    ("US-VA", "Question 1"): ("civil-family-community.restrict-abortion", "repeal", "a constitutional right to reproductive freedom"),
    ("US-VA", "Question 3"): ("justice-public-safety.restore-voting-after-sentence", "enact", None),
    ("US-VT", "Proposal 3"): ("labor-workforce.public-sector-collective-bargaining", "enact", "a constitutional right to organize, public and private"),
    ("US-WA", "Initiative 645"): ("fiscal.adopt-income-tax", "repeal", "repeals the tax on household income over $1 million"),
}


def pass_share(rule: str, kind: str) -> float:
    rule = rule.lower()
    amendment = "amendment" in kind
    if rule.startswith("60%"):
        return 0.6
    if "55% for constitutional amendments" in rule and amendment:
        return 0.55
    return 0.5


def main() -> None:
    source = json.loads(SOURCE.read_text())
    measures = []
    found = set()
    for m in source["measures2026"]:
        key = (m["state"], m["title"])
        if key not in MAPPING:
            continue
        found.add(key)
        question, yes_means, note = MAPPING[key]
        process = source["process"][m["state"]]
        rule = process["passage"]
        twice = "two consecutive general elections" in rule and m["kind"] == "initiated amendment"
        measures.append(
            {
                "id": f"measure:{m['state']}:{m['electionDate']}:{m['title'].lower().replace(' ', '-')}",
                "stateKey": m["state"],
                "title": m["title"],
                "kind": m["kind"],
                "subject": m["subject"],
                "question": Q + question,
                "yesMeans": yes_means,
                "matchNote": note,
                "electionDate": m["electionDate"],
                "passShare": pass_share(rule, m["kind"]),
                "passRule": rule,
                "enactsOnApproval": not twice,
                "recordedResult": m.get("result"),
                "source": m["source"],
            }
        )
    missing = set(MAPPING) - found
    if missing:
        raise SystemExit(f"measures not in the research: {sorted(missing)}")
    OUT.write_text(
        json.dumps(
            {
                "about": "Real 2026 statewide ballot measures that settle a recorded policy question (Ballotpedia via data/research/elections/ballot-measures-2026.json). yesMeans says whether a yes vote enacts the policy or repeals it; matchNote says where the measure is narrower or broader than the question. Built by scripts/research/build-ballot-measures.py.",
                "measures": sorted(measures, key=lambda r: r["id"]),
            },
            indent=2,
        )
        + "\n"
    )
    print(len(measures), "measures")


main()
