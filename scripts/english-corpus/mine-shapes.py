# Mines public-domain American speech for the sentence shapes a part bank
# needs, and writes the bank: every kept part is a whole sentence real people
# said, with the record-specific words (a name, an employer, a town, a date)
# replaced by slots the game fills from its own records.
#
# Usage:
#   python3 -I scripts/english-corpus/mine-shapes.py <shapes.json> <corpus-dir> > bank.json
#
# <corpus-dir> holds one subdirectory per source. Each document is <id>.txt
# (plain text) with <id>.json beside it: {"id", "source", "title", "date",
# "url", "license"}. The corpus stays outside the repository; only the bank
# and its counts are committed.
#
# A shape is a candidate sentence with slots. It is kept when at least
# `minDocuments` separate documents (default 2) say it as a whole sentence,
# spoken or quoted, and at least one of them is a public-domain record from
# 2015 or later; that newest public-domain document is the part's source.
# Older documents (the WPA life histories, 1936 to 1940) count toward the
# attestation but are never the shipped source, so every part is current
# American English.
import json, os, re, sys, collections

ERA_START = "2015-01-01"
PUBLIC_DOMAIN = re.compile(r"^https://(?:[a-z0-9-]+\.)+gov/")

MONTH = r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
NUMBER_WORD = r"(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)"
PROPER_WORD = r"[A-Z][A-Za-z0-9&'.\-]*"
LINK = r"(?:of|and|&|the|de|la|du|on|at)"
PROPER = PROPER_WORD + r"(?: (?:" + PROPER_WORD + r"|" + LINK + r"))*"
RELATION = r"(?:mother|father|mom|dad|sister|brother|son|daughter|wife|husband|grandmother|grandfather|grandma|grandpa|aunt|uncle|cousin|niece|nephew|partner|kids|children|parents|family|folks)"

# What each slot may stand for in a real sentence. A slot's words are dropped
# when the part is written; only the slot name ships.
SLOT_PATTERNS = {
    "employer": r"(?:the )?" + PROPER,
    "claimed": r"(?:the )?" + PROPER,
    "my_employer": r"(?:the )?" + PROPER,
    "place": PROPER + r"(?:, " + PROPER + r")?",
    "my_place": PROPER + r"(?:, " + PROPER + r")?",
    "school": r"(?:the )?" + PROPER,
    "name": r"[A-Z][a-z]+(?: [A-Z][a-z]+)?",
    "other": r"[A-Z][a-z]+(?: [A-Z][a-z]+)?",
    "who": r"[A-Z][a-z]+(?: [A-Z][a-z]+)?",
    "years": r"(?:\d{1,2}|" + NUMBER_WORD + r"(?:[- ]" + NUMBER_WORD + r")?)",
    "age": r"(?:\d{1,3}|" + NUMBER_WORD + r"(?:[- ]" + NUMBER_WORD + r")?)",
    "times": r"(?:" + NUMBER_WORD + r" times|twice|once)",
    "since": r"(?:" + MONTH + r" (?:of )?)?(?:19|20)\d\d",
    "my_since": r"(?:" + MONTH + r" (?:of )?)?(?:19|20)\d\d",
    "when": MONTH + r" \d{1,2}(?:st|nd|rd|th)?(?:, (?:19|20)\d\d)?",
    "my_when": MONTH + r" \d{1,2}(?:st|nd|rd|th)?(?:, (?:19|20)\d\d)?",
    "deadline": MONTH + r" \d{1,2}(?:st|nd|rd|th)?(?:, (?:19|20)\d\d)?",
    "relation": r"(?:my|your|his|her) " + RELATION,
    "kin": RELATION,
    "office": r"(?:the )?(?:[A-Z][a-z]+ )?(?:[Cc]ity [Cc]ouncil|[Cc]ouncil|[Mm]ayor|[Ss]chool [Bb]oard|[Cc]ounty [Cc]ommission|[Ss]tate [Ss]enate|[Ss]tate [Hh]ouse|[Ss]heriff|[Gg]overnor|[Cc]ongress|[Ss]elect [Bb]oard|[Bb]oard of [A-Z][a-z]+)(?:,? (?:[Ss]eat|[Dd]istrict|[Ww]ard) \d+)?",
    "fee": r"\$\d[\d,]*(?:\.\d\d)?",
    "signatures": r"(?:\d[\d,]*|" + NUMBER_WORD + r"(?: hundred| thousand)?)",
    "required": r"[\w$,.\- ]{1,30}",
    "actual": r"[\w$,.\- ]{1,30}",
    "wage": r"\$\d+(?:\.\d\d)?",
    "topic": r"(?:the |that |this )?[A-Za-z][\w' -]{2,40}",
    "subject": PROPER,
    "whose": PROPER + r"'s?",
    "host": r"[A-Z][a-z]+(?: [A-Z][a-z]+)?'s?",
}

TITLE_ABBREVIATIONS = re.compile(r"\b(Mr|Mrs|Ms|Dr|St|Jr|Sr|Gen|Sen|Rep|Gov|Lt|Col|Capt|Sgt|No|Mt|Ft|Inc|Co|Corp|Bros|U\.S)\.")
SENTENCE_END = re.compile(r"(?<=[.?!])[\"']?\s+(?=[\"']?[A-Z])")
SPEAKER_LABEL = re.compile(r"^(?:(?:Mr|Mrs|Ms|Dr|Chairman|Chairwoman|Senator|Representative)\.? )?[A-Z][A-Za-z'\-]+(?: [A-Z][A-Za-z'\-]+)?\s?[.:]\s+")
QUOTED = re.compile(r"\"([^\"]{2,200})\"")


def template_regex(text):
    """A candidate's text with slots becomes a whole-sentence pattern."""
    out = []
    pos = 0
    for match in re.finditer(r"\{(\w+)\}", text):
        out.append(literal(text[pos : match.start()]))
        slot = match.group(1)
        out.append("(?:" + SLOT_PATTERNS[slot] + ")")
        pos = match.end()
    out.append(literal(text[pos:]))
    body = "".join(out)
    # The final mark may be a period or an exclamation in speech.
    body = re.sub(r"\\\.$", r"[.!]", body)
    return re.compile(r"^" + body + r"$")


def literal(text):
    escaped = re.escape(text)
    # A sentence may start in either case; spaces may be any run of spaces.
    escaped = escaped.replace(r"\ ", r"\s+")
    if escaped and escaped[0].isalpha():
        escaped = "[" + escaped[0].upper() + escaped[0].lower() + "]" + escaped[1:]
    return escaped


def sentences(text):
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    text = text.replace("—", " -- ").replace(" ", " ")
    protected = TITLE_ABBREVIATIONS.sub(lambda m: m.group(1).replace(".", "․") + "․", text)
    for para in re.split(r"\n\s*\n", protected):
        para = re.sub(r"\s+", " ", para).strip()
        if not para:
            continue
        pieces = [para]
        pieces += [q.strip() for q in QUOTED.findall(para)]
        for piece in pieces:
            for sentence in SENTENCE_END.split(piece):
                sentence = sentence.strip().strip('"').strip()
                sentence = sentence.replace("․", ".")
                if not sentence:
                    continue
                yield sentence
                stripped = SPEAKER_LABEL.sub("", sentence, count=1)
                if stripped != sentence:
                    yield stripped
                # A quoted line inside a sentence may close with a comma: He said, "Still at the mill?"
                for lead in ("Well, ", "Oh, ", "Yeah, ", "Yes, ", "No, ", "And ", "So "):
                    if sentence.startswith(lead) and len(sentence) > len(lead) + 2:
                        yield sentence[len(lead)].upper() + sentence[len(lead) + 1 :]


def load_corpus(root):
    for source in sorted(os.listdir(root)):
        folder = os.path.join(root, source)
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            if not name.endswith(".txt"):
                continue
            meta_path = os.path.join(folder, name[:-4] + ".json")
            if not os.path.exists(meta_path):
                continue
            with open(meta_path, encoding="utf-8") as handle:
                meta = json.load(handle)
            with open(os.path.join(folder, name), encoding="utf-8", errors="replace") as handle:
                yield meta, handle.read()


def main():
    shapes_path, corpus_root = sys.argv[1], sys.argv[2]
    with open(shapes_path, encoding="utf-8") as handle:
        spec = json.load(handle)
    minimum = spec.get("minDocuments", 2)
    candidates = []
    for group in spec["groups"]:
        for candidate in group["candidates"]:
            text = candidate if isinstance(candidate, str) else candidate["text"]
            extra = {} if isinstance(candidate, str) else {k: v for k, v in candidate.items() if k != "text"}
            candidates.append((group, text, extra, template_regex(text)))
    # A quick first-word index keeps the scan linear in the corpus.
    by_first = collections.defaultdict(list)
    for index, (_, text, _, _) in enumerate(candidates):
        first = re.match(r"[A-Za-z']+", text)
        by_first[(first.group(0).lower() if first and not text.startswith("{") else "*")].append(index)

    seen = collections.defaultdict(dict)  # candidate index -> doc id -> meta
    documents = collections.Counter()
    for meta, text in load_corpus(corpus_root):
        documents[meta.get("source", "?")] += 1
        doc_id = meta["id"]
        for sentence in set(sentences(text)):
            if len(sentence) > 160:
                continue
            first = re.match(r"[A-Za-z']+", sentence)
            keys = ["*"] + ([first.group(0).lower()] if first else [])
            for key in keys:
                for index in by_first.get(key, ()):
                    if doc_id in seen[index]:
                        continue
                    if candidates[index][3].match(sentence):
                        seen[index][doc_id] = meta

    # One part per sentence: a sentence that serves several groups (the same
    # "I'm still at {employer}." raising work and replying about it) is one
    # part listing every use, so each text ships once.
    parts, rejected = [], []
    by_text = {}
    used_keys = collections.Counter()
    for index, (group, text, extra, _) in enumerate(candidates):
        use = {k: v for k, v in group.items() if k not in ("kind", "candidates", "note")}
        use.update(extra)
        if text in by_text:
            if use not in by_text[text]["uses"]:
                by_text[text]["uses"].append(use)
            continue
        docs = list(seen[index].values())
        modern = sorted(
            (d for d in docs if d.get("date", "") >= ERA_START and PUBLIC_DOMAIN.match(d.get("url", ""))),
            key=lambda d: (d["date"], d["id"]),
            reverse=True,
        )
        if len(docs) < minimum or not modern:
            rejected.append({"move": group["move"], "text": text, "documents": len(docs), "modern": len(modern)})
            continue
        source = modern[0]
        base = group["move"] + "." + slug(text)
        used_keys[base] += 1
        key = f"{spec['register']}.{base}" + ("" if used_keys[base] == 1 else f"-{used_keys[base]}")
        by_source = collections.Counter(d.get("source", "?") for d in docs)
        part = {
            "key": key,
            "move": group["move"],
            "kind": group.get("kind", "spoken"),
            "text": text,
            "uses": [use],
            "transcriptsUsing": len(docs),
            "bySource": dict(sorted(by_source.items())),
            "shippable": True,
            "source": {
                "document": source.get("title") or source.get("source"),
                "date": source["date"],
                "granule": source["id"],
                "url": source["url"],
                "license": source.get("license", "U.S. government work, public domain (17 U.S.C. 105)"),
            },
        }
        by_text[text] = part
        parts.append(part)

    bank = {
        "schema": "english-parts/1",
        "register": spec["register"],
        "description": spec["description"],
        "slots": spec["slots"],
        "maxWords": spec["maxWords"],
        "mining": {
            "tool": "scripts/english-corpus/mine-shapes.py",
            "shapes": shapes_path,
            "read": dict(sorted(documents.items())),
            "rule": f"A shape is kept when at least {minimum} documents say it as a whole sentence and one of them is a public-domain record from {ERA_START[:4]} or later, which is its source.",
            "notAttested": rejected,
        },
        "parts": parts,
    }
    json.dump(bank, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")


def slug(text):
    words = re.sub(r"\{(\w+)\}", lambda m: m.group(1).replace("_", "-"), text.lower())
    words = re.sub(r"[^a-z0-9 \-]", "", words.replace("'", ""))
    return "-".join(words.split())[:48].strip("-")


if __name__ == "__main__":
    main()
