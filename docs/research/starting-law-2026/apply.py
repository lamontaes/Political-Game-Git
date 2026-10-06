# python3 apply.py <research.json>... : move approved rows into their area shard.
# Each row keeps its own "preempts" when the research set one. Otherwise: true, except
# where a "yes" answer means cities are allowed to act (LOCAL_POWER_QUESTIONS), and where
# the question limits something cities may still go further on (rent stabilization).
import json, sys
from area_data import load, save

LOCAL_POWER_QUESTIONS = {
    "transportation-infrastructure.public-broadband",
    "labor-workforce.local-minimum-wage-authority",
}
data = load()
for path in sys.argv[1:]:
    research = json.load(open(path))
    key = research["question"]
    short = key.split(":")[1]
    old = data["questions"].get(key, {"answers": {}})
    answers = {}
    for place, row in research["answers"].items():
        out = {"answer": row["answer"]}
        if row.get("operativeAt"):
            out["operativeAt"] = row["operativeAt"]
        if "preempts" in row:
            out["preempts"] = row["preempts"]
        elif short in LOCAL_POWER_QUESTIONS:
            out["preempts"] = row["answer"] == "no"
        else:
            out["preempts"] = True
        if row.get("cite"):
            out["cite"] = row["cite"]
        out["source"] = row["source"]
        if row.get("note"):
            out["note"] = row["note"]
        answers[place] = out
    for place, row in old["answers"].items():
        answers.setdefault(place, row)
    unknown = sorted(p for p in research["unknown"] if p not in answers)
    data["questions"][key] = {
        "source": research["summarySource"],
        "note": ("Unknown, and left out: " + ", ".join(unknown) + ".")
        if unknown
        else "Every place is answered.",
        "answers": dict(sorted(answers.items())),
    }
save(data)
