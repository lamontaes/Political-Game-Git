"""The owner's grading page for a batch of held hand-written lines.

    python3 scripts/dialogue-batch/held-page/build.py batch-22 <out.html>

Reads data/english/batches/<id>.json (written by held-parts-batch.ts) and
fills template.html with its lines, grouped by bank and move, each with the
record every blank comes from. The Words session publishes the page as a
claude.ai artifact with the `db` and `user` capabilities (owner, Oct 24: "You're
supposed to give me the batches in an artifact."). Grades save to the
artifact's `grades` collection, one document per line number
(`{i, grade: "good" | "bad" | "fix" | null, note}`); the session reads them
back and writes data/english/grades/<id>.json for apply-grades.ts. The page
words nothing: it shows the bank's own lines and record notes.
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
batch_id, out = sys.argv[1], sys.argv[2]
batch = json.loads((ROOT / "data/english/batches" / f"{batch_id}.json").read_text())
if batch.get("kind") != "held-parts-by-move":
    sys.exit(f"{batch_id} is not a batch of held lines by move")
items = [
    {
        "i": item["i"],
        "bank": item["bank"].removesuffix(".json"),
        "move": item["move"],
        "shared": item.get("sharedMove") or "",
        "key": item.get("key") or "",
        "text": item["text"],
        "slots": item.get("slots", []),
        "requires": item.get("requires", []),
    }
    for item in batch["items"]
]
data = json.dumps({"id": batch["id"], "items": items}, ensure_ascii=False)
template = (pathlib.Path(__file__).parent / "template.html").read_text()
title = batch["id"].replace("batch-", "batch ")
page = (
    template.replace("__DATA__", data.replace("</", "<\\/"))
    .replace("__TITLE__", f"Words {title.title()}")
    .replace("__HEADING__", f"Words {title}")
    .replace("__COUNT__", str(len(items)))
)
pathlib.Path(out).write_text(page)
print(f"{len(items)} lines -> {out}")
