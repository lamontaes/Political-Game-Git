#!/usr/bin/env python3
"""Measures how the shape of a line differs by register class (data/english/calibration.json registerClasses) and writes docs/reports/register-shapes-2026-11-08.md."""
import glob, json, os, re, statistics, collections

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + "/"
classes = json.load(open(R + "data/english/calibration.json"))["registerClasses"]
rows = collections.defaultdict(list)
for f in sorted(glob.glob(R + "data/english/parts/*.json")):
    bank = os.path.basename(f)[:-5]
    try:
        d = json.load(open(f))
    except Exception:
        continue
    for p in d.get("parts", []):
        text = p.get("text", "")
        if not text:
            continue
        purpose = next((u["purpose"] for u in p.get("uses", []) if u.get("purpose") and u["purpose"] != "*"), None)
        cls = classes.get(f"{bank}:{purpose}") or classes.get(bank)
        if cls:
            rows[cls].append(text)

def words(t):
    return len(re.findall(r"[A-Za-z']+", re.sub(r"\{[^}]*\}", "X", t)))

def share(ts, pattern, flags=0):
    return sum(1 for t in ts if re.search(pattern, t, flags)) / len(ts)

NAMES = {
    "public": "Speeches (opening address, speech stages)",
    "broadcast": "News, headlines and newscasts",
    "narration": "Journal, scene narration and labels",
    "private": "Private talk (family, friends, work, school)",
    "floor": "On the floor (votes, bills, hearings, vetoes)",
    "hallway": "In the hallway (donors, lobbyists, party, staff)",
    "press": "With the press (interviews, scandals, debates)",
    "town-hall": "With residents (town hall, protests, rallies)",
    "election": "Around an election (filing, concessions, rivals)",
}
ORDER = ["public", "broadcast", "narration", "private", "floor", "hallway", "press", "town-hall", "election"]
lines = [
    "# Register shapes, Nov 8, 2026",
    "",
    "A line is shaped by the kind of scene it belongs to. Speeches run about 18 words and never ask a question. News and journal lines are short (6 words) and almost never use a contraction. Spoken scene lines run 8 to 10 words with contractions in about six in ten. The five kinds of spoken scene (floor, hallway, press, residents, election) are graded apart now, but they are not yet shaped apart: their lengths sit within two words of each other.",
    "",
    "## What was measured",
    "",
    "| Kind of line | Lines | Words, mean | Words, middle | Three words or fewer | Ask a question | Use a contraction | Say I | Say you |",
    "|---|---|---|---|---|---|---|---|---|",
]
ASK = r"\?$"
CONTRACTION = r"\b\w+'(s|t|re|ll|ve|d|m)\b"
SAY_I = r"\b(I|I'm|I'll|my|me)\b"
SAY_YOU = r"\b(you|your|you're)\b"
for c in ORDER:
    ts = rows[c]
    w = [words(t) for t in ts]
    short = sum(1 for n in w if n <= 3) / len(w)
    ask = share([t.strip() for t in ts], ASK)
    con = share(ts, CONTRACTION)
    i_say = share(ts, SAY_I)
    you_say = share(ts, SAY_YOU, re.I)
    lines.append(
        f"| {NAMES[c]} | {len(ts)} | {statistics.mean(w):.1f} | {statistics.median(w):.0f} | "
        f"{short:.0%} | {ask:.0%} | {con:.0%} | {i_say:.0%} | {you_say:.0%} |"
    )
lines += [
    "",
    "## What it shows",
    "",
    "The owner asked that the English work differently for different kinds of scenes. Three things now do. A grade reaches only lines of its own kind, so grading a floor line no longer moves a hallway word. Speeches, news and the journal differ sharply in length, questions and contractions. And the speech registers (the floor, press briefing, town hall, rally, eulogy and the rest) shape speeches.",
    "",
    "## What is still open",
    "",
    "A hallway word, a floor exchange, a press answer and a resident's question read alike in length and manner. A real hallway word is shorter and quieter than a floor exchange, which is more formal (Madam Chair, I yield, the gentleman from). The next step is to give each spoken kind its own devices from the register cards, and to grade by kind so the owner's grades shape them. The register cards' own measured corpora give targets. In ordinary talk about 45 percent of turns are three words or fewer (Santa Barbara Corpus). The hallway has 8 percent, up from 2 percent before tonight's 37 short hallway lines. The floor opens by thanking the chair in 82 percent of turns (Pennsylvania Legislative Journal), a form the banks do not yet have. A press briefing question runs 14 words in the middle and an answer 17. Public comment at a hearing now counts with residents, not the floor.",
    "",
    "## How this was made",
    "",
    "The numbers are counted from every bank piece in the English engine's banks, grouped by the register class that grades use (the bank, or the bank and the scene's purpose for scene talk). A word is a run of letters; slots are counted as one word. The script is scripts/reports/register-shapes.py.",
]
open(R + "docs/reports/register-shapes-2026-11-08.md", "w").write("\n".join(lines) + "\n")
print({c: len(rows[c]) for c in ORDER})
