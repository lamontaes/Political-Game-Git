# Counts how a reply follows a question in public-record talk (EM-3b): White House
# press briefings (reporter asks, press secretary answers) and congressional hearings
# (member asks, witness answers). For each question turn and the turn after it, it
# records the question's form, how the reply opens, the reply's length, and which
# bank part opens the reply when one does. Counts only; no new sentence ships.
# Usage: python3 -I count-exchanges.py press <dir of b<N>.html> <parts/press.json>
#        python3 -I count-exchanges.py hearing <dir of CHRG-*.htm> <parts/hearing.json>
import re, glob, html, sys, json, collections, statistics

register, d, bank = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
PART = {p["text"]: p["key"] for p in bank["parts"]}
YESNO = re.compile(r"^(is|are|was|were|do|does|did|can|could|will|would|should|have|has|had|may|might|isn't|aren't|don't|doesn't|didn't|won't|wouldn't)\b")
WH = re.compile(r"^(who|whom|whose|what|when|where|why|which|how)\b")
OPENERS = [("yes", r"(yes|yeah|yep)\b"), ("no", r"(no|nope)\b"), ("well", r"well\b"), ("so", r"so\b"), ("look", r"look\b"), ("i think", r"i think\b"), ("thanks", r"(thank|thanks)\b"), ("absolutely", r"(absolutely|of course|certainly|sure)\b"), ("sorry", r"(sorry|i'm sorry|i am sorry|excuse me)\b"), ("i don't know", r"(i don't know|i do not know)\b"), ("again", r"again\b")]
SPLIT = re.compile(r"(?<!Mr\.)(?<!Ms\.)(?<!Mrs\.)(?<!Dr\.)(?<=[.?!])\s+")

def turns_press(f):
    t = html.unescape(re.sub(r"<[^>]+>", "\n", open(f, errors="ignore").read())).replace("’", "'")
    for para in t.split("\n"):
        para = para.strip()
        m = re.match(r"^(?:MS|MR)\. [A-Z][A-Z' -]+:\s*(.*)", para)
        q = re.match(r"^Q\s+(.*)", para)
        if m:
            yield "answerer", m.group(1)
        elif q:
            yield "asker", q.group(1)

ASKERS = re.compile(r"^(Chairman|Chairwoman|Chair|Senator|Representative|Mrs?\.|Ms\.|Dr\.)$")
def turns_hearing(f):
    t = html.unescape(re.sub(r"<[^>]+>", "", open(f, errors="ignore").read())).replace("’", "'")
    for para in re.split(r"\n(?=    \S)", t):
        m = re.match(r"^\s{4}(Chairman|Chairwoman|Chair|Senator|Representative|Mr\.|Ms\.|Mrs\.|Dr\.|General|Secretary|Admiral)\s?([A-Z][A-Za-z'-]+)\.\s+(.*)", para, re.S)
        if m:
            yield m.group(1) + " " + m.group(2), re.sub(r"\s+", " ", m.group(3))

forms, openers, parts, lengths, first_words = collections.Counter(), collections.Counter(), collections.Counter(), collections.defaultdict(list), []
documents, pairs = 0, 0
files = glob.glob(d + ("/b*.html" if register == "press" else "/CHRG-*.htm"))
for f in files:
    seq = list(turns_press(f) if register == "press" else turns_hearing(f))
    if len(seq) < 2:
        continue
    documents += 1
    for (who, text), (who2, reply) in zip(seq, seq[1:]):
        if who2 == who:
            continue
        if register == "press" and not (who == "asker" and who2 == "answerer"):
            continue
        sents = [s for s in SPLIT.split(text.strip()) if s]
        if not sents or not sents[-1].endswith("?"):
            continue
        last = sents[-1].lower()
        form = "yes-no" if YESNO.match(last) else "wh" if WH.match(last) else "other"
        rs = [s for s in SPLIT.split(reply.strip()) if s]
        if not rs:
            continue
        pairs += 1
        forms[form] += 1
        low = rs[0].lower()
        opener = next((name for name, pat in OPENERS if re.match(pat, low)), "other")
        openers[f"{form}:{opener}"] += 1
        words = len(reply.split())
        lengths[form].append(words)
        if rs[0] in PART:
            parts[PART[rs[0]]] += 1

def share(c, total):
    return {k: round(v / total, 3) for k, v in sorted(c.items(), key=lambda x: -x[1])}
out = {
    "documents": documents,
    "questionReplyPairs": pairs,
    "questionFormShare": share(forms, pairs),
    "replyOpenerShareByForm": {f: share(collections.Counter({k.split(":")[1]: v for k, v in openers.items() if k.startswith(f + ":")}), forms[f]) for f in forms},
    "medianReplyWordsByForm": {f: statistics.median(v) for f, v in lengths.items()},
    "shareRepliesUnder10WordsByForm": {f: round(sum(1 for w in v if w < 10) / len(v), 3) for f, v in lengths.items()},
    "bankPartOpensReply": dict(sorted(parts.items(), key=lambda x: -x[1])),
}
print(json.dumps(out, indent=2))
