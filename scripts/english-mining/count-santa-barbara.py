# Counts turn shapes in the Santa Barbara Corpus of Spoken American English
# (CC BY-ND 3.0 US; counts and short tokens only, never lines). Usage:
# python3 -I count-santa-barbara.py <dir of SBC*.trn> > counts.json
# Corpus: https://www.linguistics.ucsb.edu/research/santa-barbara-corpus-spoken-american-english
import re, glob, sys, json, collections, statistics

REACTIONS = ["yeah", "mhm", "uh-huh", "oh", "right", "okay", "really", "wow", "no", "yes", "huh", "hm", "sure", "oh yeah", "oh really", "oh no", "oh wow", "i know", "that's right", "exactly"]
TURN_OPENERS = ["well", "so", "oh", "and", "but", "yeah", "no", "i", "you", "okay", "now", "see", "like", "um", "uh"]
HEDGES = ["i think", "i mean", "you know", "kind of", "sort of", "i guess", "maybe", "probably", "like"]

def clean(text):
    text = re.sub(r"<[^>]*>|\([^)]*\)|\[\d?|\d?\]|~|=|@+|%|\bX+\b|\.\.+|--+|[<>]", " ", text)
    return re.sub(r"\s+", " ", text).strip()

turns = []
for f in sorted(glob.glob(sys.argv[1] + "/SBC*.trn")):
    speaker, words, ends = None, [], ""
    for line in open(f, encoding="latin-1"):
        parts = line.rstrip("\n").split("\t")
        if len(parts) < 3:
            continue
        who, text = parts[-2].strip().rstrip(":").strip(), parts[-1]
        if who and who != speaker:
            if speaker and words:
                turns.append((words, ends))
            speaker, words = who, []
        cleaned = clean(text)
        if cleaned:
            words += cleaned.lower().replace(",", "").replace("?", "").replace(".", "").split()
            ends = "?" if "?" in text else ends if not cleaned else ""
    if speaker and words:
        turns.append((words, ends))

lengths = [len(w) for w, _ in turns]
joined = [" ".join(w) for w, _ in turns]
reaction_counts = collections.Counter(j for j in joined if j in REACTIONS)
opener_counts = collections.Counter(w[0] for w, _ in turns if len(w) > 1 and w[0] in TURN_OPENERS)
hedge_counts = {h: sum(f" {j} ".count(f" {h} ") for j in joined) for h in HEDGES}
total_words = sum(lengths)
out = {
    "turns": len(turns),
    "words": total_words,
    "medianTurnWords": statistics.median(lengths),
    "shareTurnsThreeWordsOrFewer": round(sum(1 for n in lengths if n <= 3) / len(lengths), 3),
    "shareTurnsOneWord": round(sum(1 for n in lengths if n == 1) / len(lengths), 3),
    "questionRate": round(sum(1 for _, e in turns if e == "?") / len(turns), 3),
    "reactionTurnsPer1000Turns": {k: round(v * 1000 / len(turns), 1) for k, v in reaction_counts.most_common()},
    "turnOpenerPer1000Turns": {k: round(v * 1000 / len(turns), 1) for k, v in opener_counts.most_common()},
    "hedgesPer1000Words": {k: round(v * 1000 / total_words, 2) for k, v in sorted(hedge_counts.items(), key=lambda x: -x[1])},
}
print(json.dumps(out, indent=2))
