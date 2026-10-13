"""Build the law-reach classification: for every law the game can hold in
force (each policy question and each law series), who it reaches, how and how
often, and where the engine records it.

Policy questions are classified from their reach specs (reach-group-a.json,
reach-group-b.json, policy-effects.json); law series are classified below,
each with the statute that says what it does.

Run: python3 scripts/research/build-law-reach-classes.py
"""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
LAWS = ROOT / "src/core2/data/laws"
OUT = LAWS / "law-reach-classes.json"

WHO = {
    "people": "people",
    "counted": "people",
    "estimated": "people",
    "staff": "people",
    "organizations": "businesses",
    "officeholders": "officeholders",
    "mechanic": "budget-line",
}
HOW_ORDER = ["payment", "service", "compliance", "price", "rule", "eligibility", "right", "job"]

# Law series: what each does, from its statute or ordinance.
SERIES = {
    "income-tax": {"who": ["people"], "how": "payment-from", "often": "each paycheck", "evidence": ["withholding"],
                    "what": "income tax withheld from pay"},
    "social-security-tax": {"who": ["people"], "how": "payment-from", "often": "each paycheck", "evidence": ["withholding"],
                             "what": "Social Security tax withheld from pay (26 U.S.C. 3101(a))"},
    "medicare-tax": {"who": ["people"], "how": "payment-from", "often": "each paycheck", "evidence": ["withholding"],
                      "what": "Medicare tax withheld from pay (26 U.S.C. 3101(b))"},
    "minimum-wage": {"who": ["businesses"], "how": "compliance", "often": "while in force", "evidence": ["employers"],
                      "what": "every employer pays at least the floor (29 U.S.C. 206 and state and local wage laws)"},
    "local-minimum-wage-authority": {"who": ["government"], "how": "rule", "often": "while in force",
                                      "evidence": ["local-government"],
                                      "what": "whether the town's government may set its own minimum wage"},
    "local-income-tax-authority": {"who": ["government"], "how": "rule", "often": "while in force",
                                    "evidence": ["local-government"],
                                    "what": "whether the town's government may levy an income tax"},
    "sales-tax": {"who": ["businesses"], "how": "compliance", "often": "each sale", "evidence": ["sellers"],
                   "what": "sellers collect the sales tax on each taxable sale"},
    "local-sales-tax-average": {"who": ["businesses"], "how": "compliance", "often": "each sale", "evidence": ["sellers"],
                                 "what": "sellers collect the local sales tax on each taxable sale"},
    "property-tax": {"who": ["people"], "how": "payment-from", "often": "each year", "evidence": ["property-tax"],
                      "what": "owners pay the property tax on their homes"},
    "unemployment-insurance": {"who": ["people"], "how": "payment", "often": "each week of a claim",
                                "evidence": ["payments", "claims"],
                                "what": "a worker who loses a job through no choice of their own is paid a weekly benefit"},
    "unemployment-weekly-maximum": {"who": ["people"], "how": "payment", "often": "each week of a claim",
                                     "evidence": ["claims"],
                                     "what": "the most a weekly unemployment benefit pays"},
    "snap-maximum": {"who": ["people"], "how": "payment", "often": "each month", "evidence": ["payments"],
                      "what": "eligible households are paid a monthly food allotment (7 U.S.C. 2017(a))"},
    "medicaid-match": {"who": ["budget-line"], "how": "payment", "often": "each year", "evidence": ["state-line:welfareAndMedicaid"],
                        "what": "the federal government pays its share of the state's Medicaid spending (42 U.S.C. 1396d(b))"},
    "unemployment-weekly-minimum": {"who": ["people"], "how": "payment", "often": "each week of a claim",
                                     "evidence": ["claims"], "what": "the least a weekly unemployment benefit pays"},
}


def load(name):
    return json.loads((LAWS / name).read_text())


def first_how(kinds):
    for how in HOW_ORDER:
        if how in kinds:
            return how
    return kinds[0] if kinds else "rule"


def main():
    a = load("reach-group-a.json")["policies"]
    b = load("reach-group-b.json")["policies"]
    effects = load("policy-effects.json")["effects"]
    classes = {}
    for key, spec in a.items():
        if "-positions:" not in key:
            continue
        who = sorted({WHO[r["target"]] for r in spec["reaches"]})
        kinds = [r["kind"] for r in spec["reaches"]]
        classes[key] = {"who": who or ["businesses"], "how": first_how(kinds), "often": "while in force",
                        "evidence": ["policy-records"], "engine": "law-reach group A", "mechanic": spec["mechanic"]}
    for key, spec in b.items():
        if "-positions:" not in key:
            continue
        who = []
        if spec.get("people"):
            who.append("people")
        if spec.get("organizations"):
            who.append("businesses")
        if spec["mechanic"] in ("balanced-budget", "pension-funding", "reserve", "highway-shift", "transit-fares"):
            who.append("budget-line")
        if spec["mechanic"] == "teacher-floor":
            who.append("people")
        classes[key] = {"who": sorted(set(who)) or ["budget-line"], "how": spec.get("kind", "rule"),
                        "often": "while in force", "evidence": ["policy-records"], "engine": "law-reach group B",
                        "mechanic": spec["mechanic"], "organizations": spec.get("organizations") or []}
    for key, effect in effects.items():
        row = classes.setdefault(key, {"who": [], "how": effect["kind"], "often": "while in force",
                                       "evidence": ["policy-records"], "engine": "law effects", "mechanic": "records"})
        row["who"] = sorted(set(row["who"]) | {"people"})
    for key, row in SERIES.items():
        classes[key] = {**row, "engine": "series"}
    doc = {
        "id": "law-reach-classes",
        "about": "For each law the game can hold in force: who it reaches (people, businesses, officeholders, a budget line or the town's government), how (payment to them, payment from them, service, compliance, price, rule, eligibility, right) and how often, and the records the engine leaves (evidence). Policy questions are classified from their reach specs; law series from their statutes. Built by scripts/research/build-law-reach-classes.py.",
        "classes": dict(sorted(classes.items())),
    }
    OUT.write_text(json.dumps(doc, indent=2) + "\n")
    print(len(classes), "laws classified")


if __name__ == "__main__":
    main()
