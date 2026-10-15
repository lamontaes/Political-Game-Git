# Mines the presiding officer's vote announcements from Congressional Record day folders
# (unzipped CREC-YYYY-MM-DD.zip, House and Senate pages; public domain) for sourced
# winning-and-losing parts: the count, a question carried, a question lost.
# Usage: python3 -I mine-vote-outcomes.py <dir> > parts.jsonl
import re, glob, html, sys, json, collections

CHAIR = r"The (?:SPEAKER|PRESIDING OFFICER|SPEAKER pro tempore|ACTING PRESIDENT pro tempore|CHAIR|Acting CHAIR|VICE PRESIDENT)(?: \([^)]*\))?\. "
CARRIED = re.compile(r"\b(?:is|are|was|were) (?:agreed to|considered and agreed to|passed|adopted|confirmed|invoked|sustained|ordered|granted)\b|the (?:ayes|yeas) have it|two-thirds .{0,40}affirmative")
LOST = re.compile(r"\b(?:is|are|was|were) not (?:agreed to|passed|adopted|confirmed|invoked|sustained|ordered|granted)\b|the (?:noes|nays) have it|\b(?:is|was|were) rejected\b")
SUBJECT = re.compile(r"^(?:The (?:motion|amendments?|bills?|resolutions?|joint resolution|concurrent resolution|committee-reported amendments?|preamble|yeas and nays|previous question|question|nomination|cloture motion|point of order|objection)\b|A recorded vote|On this vote|Without objection, the (?:previous question|motion|amendment|resolution|bill)|Under the rule|The yeas are|The ayes have it|The noes have it|In the opinion of the Chair)")
COUNT = re.compile(r"the yeas are|the ayes are|the nays are|the noes are|On this vote")

hits = collections.OrderedDict()
for f in sorted(glob.glob(sys.argv[1] + "/**/*.htm", recursive=True)):
    gran = f.split("/")[-1][:-4]
    t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html.unescape(open(f, errors="ignore").read())))
    for m in [t]:
        for s in re.split(r"(?<=[.])\s+(?=[A-Z])", m):
            s = re.sub(r"^" + CHAIR, "", s)
            s = re.sub(r"\s*_{3,}.*$", "", s).strip()
            if not SUBJECT.match(s) or "nay are" in s:
                continue
            if not 3 <= len(s.split()) <= 18 or s.isupper():
                continue
            if re.search(r"\(|\)|`|'|\bMr\.|\bMs\.|\bH\.|\bS\.", s):
                continue
            if any(w[0].isupper() for w in s.split()[1:] if w not in ("Chair", "Senate", "House", "Journal", "I", "On")):
                continue
            move = "lost" if LOST.search(s) else "carried" if CARRIED.search(s) else "count" if COUNT.search(s) else None
            if not move:
                continue
            shape = re.sub(r"\b\d+\b", "{n}", s)
            shape = re.sub(r"\{n\}( (?:yeas|nays|ayes|noes))", r"{n}\1", shape)
            key = (move, shape)
            if key not in hits:
                hits[key] = {"move": move, "text": shape, "count": 0, "source": {"document": "Congressional Record", "date": gran[5:15], "granule": gran, "url": f"https://www.govinfo.gov/app/details/{gran[:15]}/{gran}"}}
            hits[key]["count"] += 1
for row in sorted(hits.values(), key=lambda r: (r["move"], -r["count"])):
    print(json.dumps(row))
