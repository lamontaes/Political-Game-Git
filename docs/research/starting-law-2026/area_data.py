"""Read and write the per-area starting-law shards through one ordered view."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3] / "data/research/laws/starting-law-2026"


def area_for(question_key):
    try:
        return question_key.split(":", 1)[1].split(".", 1)[0]
    except IndexError as error:
        raise ValueError(f"Invalid starting-law question key: {question_key}") from error


def _compact_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def load():
    metadata = json.loads((ROOT / "metadata.json").read_text())
    order = json.loads((ROOT / "question-order.json").read_text())
    unordered = {}
    for path in sorted(ROOT.glob("*.json")):
        if path.name in ("metadata.json", "question-order.json"):
            continue
        questions = json.loads(path.read_text())["questions"]
        for key, row in questions.items():
            if key in unordered:
                raise ValueError(f"Duplicate starting-law question: {key}")
            if area_for(key) != path.stem:
                raise ValueError(f"Question {key} is in the wrong area shard")
            unordered[key] = row
    if len(order) != len(set(order)) or set(order) != set(unordered):
        raise ValueError("Starting-law area shards do not match question-order.json")
    return {**metadata, "questions": {key: unordered[key] for key in order}}


def save(data):
    questions = data["questions"]
    areas = {}
    for key in json.loads((ROOT / "question-order.json").read_text()):
        area = area_for(key)
        areas.setdefault(area, {})[key] = questions[key]
    for key in questions:
        areas.setdefault(area_for(key), {})[key] = questions[key]

    for area, rows in areas.items():
        path = ROOT / f"{area}.json"
        content = json.dumps({"questions": rows}, ensure_ascii=False, indent=2) + "\n"
        previous = path.read_text() if path.exists() else None
        if content != previous:
            path.write_text(content)
        digest = hashlib.sha256(_compact_json(rows).encode()).hexdigest() + "\n"
        (ROOT / "expected-digests" / f"{area}.sha256").write_text(digest)

    order = list(questions)
    (ROOT / "question-order.json").write_text(
        json.dumps(order, ensure_ascii=False, indent=2) + "\n"
    )
    (ROOT / "expected-digests" / "question-order.sha256").write_text(
        hashlib.sha256(_compact_json(order).encode()).hexdigest() + "\n"
    )
