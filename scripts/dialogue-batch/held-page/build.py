"""The owner's table read of a batch of held lines, in the scenes play says them.

    node --import tsx scripts/dialogue-batch/held-page/table-read.ts batch-22 <seed> <days> <scenes.json>
    python3 scripts/dialogue-batch/held-page/build.py <scenes.json> <out.html>

table-read.ts plays the bench's world and writes every scene, journal page
and speech that says a held line, each held line tagged with its number in
data/english/batches/<id>.json. This fills template.html (the table read the
owner graded batches 14 to 21 on) with them. The Words session publishes the
page as a claude.ai artifact with the `db` and `user` capabilities; the
owner's voice notes name a line by its label ("4.b") and its held number, and
the session writes them as a grade file for apply-grades.ts. The page words
nothing: it shows the engine's own composed lines and the records' facts.
"""

import json
import pathlib
import re
import sys

src, out = sys.argv[1], sys.argv[2]
data = json.loads(pathlib.Path(src).read_text())
template = (pathlib.Path(__file__).parent / "template.html").read_text()
payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
page = re.sub(r"/\*DATA\*/\s*null", lambda m: payload, template, count=1)
pathlib.Path(out).write_text(page)
print(f"{len(data['scenes'])} scenes, {data.get('shown')} of {data.get('of')} held lines -> {out}")
