#!/usr/bin/env python3
"""Adds batches of new scene-talk lines to the bank as pure additions.

  python3 scripts/dialogue-batch/add-slot-lines.py <batch.json> [bank.json]

A batch is a list of {"anchor": <piece key>, "piece": {...}} rows. Each new
piece is written right after its anchor (the piece that already held the
slot), so the diff is additions in place and two branches that add lines to
different slots do not touch the same lines. Nothing existing is edited,
re-ordered or re-wrapped. A piece whose key is already in the bank is skipped,
so the script can run again on a fresh main; a piece whose text matches
another piece's text (any case) is refused, as the bank test requires unique
texts. Run prettier on the bank afterwards.

A development tool. It never words anything at play time.
"""
import json
import sys

batch_path = sys.argv[1]
bank_path = sys.argv[2] if len(sys.argv) > 2 else "data/english/parts/scene-talk.json"

text = open(bank_path, encoding="utf8").read()
bank = json.loads(text)
have_keys = {p["key"] for p in bank["parts"]}
have_texts = {p["text"].lower() for p in bank["parts"]}
rows = json.load(open(batch_path, encoding="utf8"))

lines = text.split("\n")
# Piece boundaries: a piece starts at "    {" and ends at "    }" or "    },".
end_of = {}
start = None
for i, line in enumerate(lines):
    if line == "    {":
        start = i
    elif line in ("    }", "    },") and start is not None:
        for j in range(start, i):
            if lines[j].startswith('      "key": "'):
                end_of[json.loads("{" + lines[j].strip().rstrip(",") + "}")["key"]] = i
                break
        start = None

inserts = {}  # line index of an anchor's end -> list of rendered pieces
skipped, refused = 0, []
for row in rows:
    piece = row["piece"]
    if piece["key"] in have_keys:
        skipped += 1
        continue
    if piece["text"].lower() in have_texts:
        refused.append(piece["key"])
        continue
    anchor = row["anchor"]
    if anchor not in end_of:
        refused.append(piece["key"] + " (no anchor)")
        continue
    have_keys.add(piece["key"])
    have_texts.add(piece["text"].lower())
    body = json.dumps(piece, indent=2, ensure_ascii=False)
    inserts.setdefault(end_of[anchor], []).append(
        "\n".join("    " + l for l in body.split("\n"))
    )

out = []
for i, line in enumerate(lines):
    if i in inserts:
        # The anchor closes with "}" (last piece) or "},"; the new pieces follow it.
        if line == "    }":
            out.append("    },")
            out.append(",\n".join(inserts[i]))
        else:
            out.append(line)
            out.append(",\n".join(inserts[i]) + ",")
    else:
        out.append(line)

open(bank_path, "w", encoding="utf8").write("\n".join(out))
print(
    f"added {sum(len(v) for v in inserts.values())}, skipped {skipped}, refused {len(refused)}"
)
for r in refused:
    print("refused:", r)
