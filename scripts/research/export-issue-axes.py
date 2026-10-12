"""Export each policy question's left-right direction, measured from real states.

For every starting-law policy question (data/research/laws/starting-law-2026),
the axis is the Pearson correlation, across the states that recorded a read
(not estimated) yes/no answer, between answering "yes" and the state's 2024
Republican two-party presidential share (data/source/electoral-calibration-2024,
from the Clerk of the House's official statistics). +1: the policy is law where
Republicans win; -1: where Democrats win; near 0: it doesn't split that way.

A stand-in for individual views (SG-GOV-views-stand-in) reads these axes until
OPUS-PEOPLE's views engine gives each person their own stance on each question.

Run: python3 scripts/research/export-issue-axes.py
"""

import glob
import json
import math
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data/research/campaigns/issue-axes-2026.json"
MINIMUM_STATES = 20


def main():
    calibration = json.loads((ROOT / "data/source/electoral-calibration-2024/corpus.json").read_text())
    right = {"US-" + row["stateUsps"]: 1 - row["democraticTwoPartyShare"] for row in calibration["presidentialByState"]}
    axes = {}
    for path in sorted(glob.glob(str(ROOT / "data/research/laws/starting-law-2026/*.json"))):
        if path.endswith(("metadata.json", "question-order.json")):
            continue
        for key, question in json.loads(pathlib.Path(path).read_text()).get("questions", {}).items():
            pairs = [
                (1.0 if answer["answer"] == "yes" else 0.0, right[state])
                for state, answer in question.get("answers", {}).items()
                if state in right and answer.get("answer") in ("yes", "no") and "estimated" not in answer
            ]
            if len(pairs) < MINIMUM_STATES:
                continue
            xs, ys = zip(*pairs)
            mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
            sx = math.sqrt(sum((x - mx) ** 2 for x in xs))
            sy = math.sqrt(sum((y - my) ** 2 for y in ys))
            if sx == 0 or sy == 0:
                continue
            r = sum((x - mx) * (y - my) for x, y in pairs) / (sx * sy)
            axes[key] = {"axis": round(r, 3), "states": len(pairs), "yesShare": round(mx, 3)}
    document = {
        "id": "issue-axes-2026",
        "about": "Each policy question's left-right direction: the correlation across states between its recorded 2026 answer being yes and the state's 2024 Republican two-party presidential share. Positive leans right, negative leans left. Measured, not authored.",
        "sources": [
            "data/research/laws/starting-law-2026 (each state's recorded answer and its source)",
            "data/source/electoral-calibration-2024/corpus.json (Clerk of the House, 2024 presidential results by state)",
        ],
        "minimumStates": MINIMUM_STATES,
        "script": "scripts/research/export-issue-axes.py",
        "axes": dict(sorted(axes.items())),
    }
    OUT.write_text(json.dumps(document, indent=1) + "\n")
    print(len(axes), "questions")


if __name__ == "__main__":
    main()
