# Mines public-domain American speech for the sentence shapes a part bank
# needs, and writes the bank: every kept part is a whole sentence real people
# said, with the record-specific words (a name, an employer, a town, a date)
# replaced by slots the game fills from its own records.
#
# Usage:
#   python3 -I scripts/english-corpus/mine-shapes.py <shapes.json> <corpus-dir> [report.json] > bank.json
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
#
# This is how a part is mined. It is not a requirement on shipped text (owner,
# Oct 15, the text rule): a part written to the calibrated patterns is tagged
# `origin: authored` in its bank, with its author and date, and skips the miner.
import json, os, re, sys, collections, multiprocessing

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
WHEN = (
    r"(?:today|yesterday|on " + MONTH + r" \d{1,2}(?:st|nd|rd|th)?(?:, (?:19|20)\d\d)?"
    r"|on (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|last (?:week|month|night|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|the other day)"
)
# A workplace is also said by what it is: "the plant", "the bank".
WORKPLACE = r"(?:the )?" + PROPER + r"|the [a-z]+(?: [a-z]+)?"
SLOT_PATTERNS = {
    "employer": WORKPLACE,
    "claimed": WORKPLACE,
    "my_employer": WORKPLACE,
    "place": PROPER + r"(?:, " + PROPER + r")?",
    "my_place": PROPER + r"(?:, " + PROPER + r")?",
    "school": r"(?:the )?" + PROPER,
    "name": r"[A-Z][a-z]+(?: [A-Z]\.)?(?: [A-Z][a-z']+){0,2}(?:,? (?:Jr|Sr)\.)?",
    "first": r"[A-Z][a-z]+",
    "other": r"[A-Z][a-z]+(?: [A-Z][a-z]+)?",
    "who": r"[A-Z][a-z]+(?: [A-Z][a-z]+)?",
    # Several people present: "Ann and Bob", "Ann, Bob and Carl".
    "who_many": r"[A-Z][a-z]+(?: [A-Z][a-z]+)?(?:, [A-Z][a-z]+(?: [A-Z][a-z]+)?)*,? and [A-Z][a-z]+(?: [A-Z][a-z]+)?",
    "years": r"(?:\d{1,2}|" + NUMBER_WORD + r"(?:[- ]" + NUMBER_WORD + r")?)",
    "age": r"(?:\d{1,3}|" + NUMBER_WORD + r"(?:[- ]" + NUMBER_WORD + r")?)",
    "times": r"(?:" + NUMBER_WORD + r" times|twice|once)",
    "since": r"(?:" + MONTH + r" (?:of )?)?(?:19|20)\d\d",
    "my_since": r"(?:" + MONTH + r" (?:of )?)?(?:19|20)\d\d",
    # When someone was last seen, as the director says it: "yesterday", "on March 3".
    "when": WHEN,
    "my_when": WHEN,
    # A deadline as people say one: a date, a weekday, noon on a date.
    "deadline": r"(?:(?:noon|midnight|\d{1,2}(?::\d\d)? ?[ap]\.?m\.?) (?:on )?)?(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),? )?(?:"
    + MONTH
    + r" \d{1,2}(?:st|nd|rd|th)?(?:, (?:19|20)\d\d)?|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|the \d{1,2}(?:st|nd|rd|th))",
    "relation": r"(?:[Mm]y|[Yy]our|[Hh]is|[Hh]er|[Oo]ur) " + RELATION,
    "kin": RELATION,
    "filing_office": r"the [A-Z][A-Za-z]+(?: (?:of|[A-Z][A-Za-z']*))* [Oo]ffice|the (?:[A-Z][a-z]+ )?(?:County |City |Town )?(?:Clerk|Registrar|Board of Elections)(?:'s [Oo]ffice)?",
    "office": r"(?:(?:the|a|an) )?(?:[A-Z][a-z]+ )?(?:[Cc]ity [Cc]ouncil|[Cc]ouncil|[Mm]ayor|[Ss]chool [Bb]oard|[Cc]ounty [Cc]ommission|[Ss]tate [Ss]enate|[Ss]tate [Hh]ouse|[Ss]heriff|[Gg]overnor|[Cc]ongress|[Ss]elect [Bb]oard|[Bb]oard of [A-Z][a-z]+|[Jj]udge|(?:[Ss]tate )?[Ss]enator|(?:[Ss]tate )?[Rr]epresentative|[Cc]ongressman|[Cc]ongresswoman|[Ss]peaker|[Ww]hip|[Ss]enate|[Cc]ommissioner|[Cc]ouncilman|[Cc]ouncilwoman|[Cc]hair(?:man|woman)?|[Cc]lerk|[Ll]ieutenant [Gg]overnor)(?:,? (?:[Ss]eat|[Dd]istrict|[Ww]ard) \d+)?",
    "fee": r"\$\d[\d,]*(?:\.\d\d)?|\d[\d,]* dollars|" + NUMBER_WORD + r"(?: hundred| thousand)? dollars",
    "signatures": r"(?:\d[\d,]*|" + NUMBER_WORD + r"(?: hundred| thousand)?)",
    "required": r"[\w$,.\- ]{1,30}",
    "actual": r"[\w$,.\- ]{1,30}",
    "wage": r"\$\d+(?:\.\d\d)?",
    "bill": r"(?:this|the) (?:bill|legislation|resolution|amendment|rule)|H\.R\. \d+|S\. \d+|the [A-Z][\w'.-]*(?: [A-Z][\w'.-]*| of| and| for| to)* Act(?: of (?:19|20)\d\d)?",
    "year": r"(?:19|20)\d\d",
    "pronoun": r"(?:his|her|their)",
    "pronoun_obj": r"(?:him|her|them)",
    "number": r"(?:\d{1,2}|" + NUMBER_WORD + r")",
    "group": r"(?:the )?" + PROPER,
    "issue": r"(?:the |this |that |our )?[a-z][\w' -]{2,40}",
    "reason": r"[a-z][\w' ,-]{3,60}",
    "hardship": r"[a-z][\w' -]{3,50}",
    "goal": r"[a-z][\w' ,-]{3,60}",
    "did": r"[a-z][\w' ,-]{3,60}",
    "opponent": r"[A-Z][a-z]+(?: [A-Z][a-z]+)?",
    "date": r"(?:" + MONTH + r" \d{1,2}(?:st|nd|rd|th)?|Tuesday|November \d{1,2})",
    "pronoun_sub": r"(?:he|she|they)",
    "percent": r"\d{1,2}(?:\.\d)?",
    "count": r"(?:\d{1,3}|" + NUMBER_WORD + r") to (?:\d{1,3}|" + NUMBER_WORD + r"|nothing)",
    "measure": r"(?:the |a |an )?[a-z][\w' -]{2,50}|(?:the )?[A-Z][\w'.-]*(?: [A-Z][\w'.-]*| of| and| for| to)*",
    "action": r"[a-z][\w' ,-]{3,60}",
    "money": r"\$\d[\d,.]*(?: (?:million|billion|trillion|thousand))?",
    # A national count as a speech says one: "800,000", "2 million", "nearly 15 million".
    "amount": r"(?:more than |nearly |almost |over )?(?:\d[\d,.]*(?: (?:thousand|million|billion))?|"
    + NUMBER_WORD
    + r"(?: (?:hundred|thousand|million|billion))+)",
    "purpose": r"[a-z][\w' ,-]{3,50}",
    # The world's national numbers the opening speech reports.
    "unemployment_rate": r"\d{1,2}(?:\.\d)?",
    "inflation_rate": r"\d{1,2}(?:\.\d)?",
    "growth_rate": r"\d{1,2}(?:\.\d)?",
    "national_debt": r"\$\d[\d,.]*(?: (?:billion|trillion))?",
    "deficit_cut": r"\$\d[\d,.]*(?: (?:million|billion|trillion))?",
    "law": r"(?:the )?[A-Z][\w'.-]*(?: [A-Z][\w'.-]*| of| and| for| to)* (?:Act|Law|Rule|Ordinance)(?: of (?:19|20)\d\d)?",
    "term": r"(?:\d{1,3}|" + NUMBER_WORD + r")(?:[- ](?:and[- ]a[- ]half[- ])?)?(?:Years?|Months?|years?|months?)",
    "crime": r"[A-Za-z][\w' ,-]{3,60}",
    "body": r"(?:the )?[A-Z][\w'.&-]*(?: [A-Z][\w'.&-]*| of| for)*",
    "matter": r"[A-Za-z][\w' ,-]{3,60}",
    "occasion": r"[A-Za-z][\w' ,-]{3,60}",
    "state": r"[a-z]+(?: and [a-z]+)?",
    "claim": r"[a-z][\w' ,-]{3,60}",
    "experience": r"[a-z][\w' ,-]{3,60}",
    "cause": r"(?:the |our |your |their )?[a-z][\w' -]{2,40}",
    "change": r"[a-z][\w' ,-]{3,60}",
    "topic": r"(?:the |that |this )?[A-Za-z][\w' -]{2,40}",
    "subject": PROPER,
    "whose": PROPER + r"'s?",
    "host": r"[A-Z][a-z]+(?: [A-Z][a-z]+)?'s?",
}
SLOT_PATTERNS["payee"] = r"(?:the )?[A-Z][\w'.&-]*(?: [A-Z][\w'.&-]*| of| and| for)*"
# A weather alert as the Weather Service names it, and until when.
SLOT_PATTERNS["alert"] = r"(?:[A-Z][a-z]+ ){0,3}(?:Warning|Watch|Advisory)"
SLOT_PATTERNS["until"] = r"(?:\d{1,4}(?::\d\d)? ?(?:AM|PM|a\.m\.|p\.m\.)(?: [A-Z]{3})?|noon|midnight)(?: (?:this evening|tonight|today|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))?"
SLOT_PATTERNS["program"] = r"(?:the )?[A-Z][\w'.&-]*(?: [A-Z][\w'.&-]*| of| and| the)*"
SLOT_PATTERNS["time"] = r"(?:\d{1,2}(?::\d\d)? ?(?:[ap]\.m\.|o'clock)|noon|midnight)"
for _count in ("jobs_added", "jobless", "population", "votes"):
    SLOT_PATTERNS[_count] = SLOT_PATTERNS["amount"]

# Slots that hold a proper name. A real sentence fills them with a name, never
# with a title, a vocative, a speaker label in capitals or a common word.
PROPER_SLOTS = {"opponent", "program", "group", "who_many", "first", "employer", "claimed", "my_employer", "place", "my_place", "school", "name", "other", "who", "subject", "whose", "host"}
NOT_A_NAME = set(
    "mr mrs ms dr miss madam madame chairman chairwoman chair senator representative congressman congresswoman "
    "secretary general admiral director commissioner governor mayor president speaker sir ma'am "
    "yes yeah no okay ok well thank thanks sure right good oh so and but now absolutely correct exactly "
    "i it that this these those we you he she they there here what who why how when where which "
    "the a an my our your his her their all both not again also indeed certainly agreed great fine "
    "god jesus christ lord america american americans congress".split()
)


# What "the ..." after "at" or "with" names when it is not a workplace.
NOT_A_WORKPLACE = set(
    "time moment end same point beginning top bottom least most first last other way day morning night "
    "year years week weeks month months process meantime while rest record course hearing committee "
    "chairman question problem issue answer idea case fact other way thing things one ones".split()
)
WORKPLACE_SLOTS = {"employer", "claimed", "my_employer"}


def names_a_record(slot, fill):
    if slot not in PROPER_SLOTS:
        return True
    if slot in WORKPLACE_SLOTS and re.fullmatch(r"the [a-z]+(?: [a-z]+)?", fill):
        return not any(word in NOT_A_WORKPLACE for word in fill.split()[1:])
    words = re.findall(r"[A-Za-z']+", fill)
    content = [w for w in words if w.lower() not in ("the", "of", "and", "de", "la", "du", "on", "at")]
    if not content:
        return False
    if content[0].lower().rstrip("'s") in NOT_A_NAME or content[0].lower() in NOT_A_NAME:
        return False
    # A speaker label is a surname in capitals; a short acronym (NASA) is a name.
    if any(len(w) > 5 and w.isupper() for w in content):
        return False
    # The fill must name something in this corpus: a short acronym, two
    # capitalized words, or a word written capitalized inside sentences far
    # more often than in lower case ("Generally, yes." names nothing).
    if not content[0][0].isupper():
        return False
    capitals = [w for w in content if w[0].isupper()]
    return (
        any(w.isupper() for w in capitals)
        or len(capitals) >= 2
        or any(PROPER_NOUNS.get(re.sub(r"'s?$", "", w), False) for w in capitals)
    )


PROPER_NOUNS = {}


def count_capitals(path):
    capital, lower = collections.Counter(), collections.Counter()
    try:
        with open(path, encoding="utf-8", errors="replace") as handle:
            text = handle.read()
    except OSError:
        return capital, lower
    for match in re.finditer(r"(?<=[a-z,;] )([A-Za-z][a-z']+)", text):
        word = match.group(1)
        if word[0].isupper():
            capital[word] += 1
        else:
            lower[word.capitalize()] += 1
    return capital, lower


def learn_proper_nouns(root, pool):
    capital, lower = collections.Counter(), collections.Counter()
    paths = [path for path, _ in documents_in(root)]
    for got_capital, got_lower in pool.imap_unordered(count_capitals, paths, chunksize=16):
        capital.update(got_capital)
        lower.update(got_lower)
    for word, count in capital.items():
        PROPER_NOUNS[word] = count >= 2 and count >= 2 * lower[word]


CLAUSE_BREAK = re.compile(r",? (?:and|but|so|because|when|where|until|after|before) |[,;:] | -- | \[")
TITLE_ABBREVIATIONS = re.compile(r"\b(Mr|Mrs|Ms|Dr|St|Jr|Sr|Gen|Sen|Rep|Gov|Lt|Col|Capt|Sgt|No|Mt|Ft|Inc|Co|Corp|Bros|U\.S)\.")
SENTENCE_END = re.compile(r"(?<=[.?!])[\"']?\s+(?=[\"']?[A-Z])")
# A transcript's speaker label: "Mr. SMITH." in hearings, "ABBOTT:" or "Smith:" in oral histories.
SPEAKER_LABEL = re.compile(
    r"^(?:(?:(?:Mr|Mrs|Ms|Dr|Chairman|Chairwoman|Senator|Representative)\.? )?[A-Z][A-Z'\-]+(?: [A-Z][A-Z'\-]+)?\s?[.:]\s+"
    r"|[A-Z][A-Za-z'\-]+(?: [A-Z][A-Za-z'\-]+)?:\s+)"
)
MIDDLE_INITIAL = re.compile(r"(\b[A-Z][a-z]+ [A-Z])\.(?= [A-Z][a-z])")
QUOTED = re.compile(r"\"([^\"]{2,200})\"")


def template_regex(text):
    """A candidate's text with slots becomes a whole-sentence pattern."""
    out = []
    pos = 0
    for number, match in enumerate(re.finditer(r"\{(\w+)\}", text)):
        out.append(literal(text[pos : match.start()]))
        slot = match.group(1)
        out.append(f"(?P<{slot}__{number}>" + SLOT_PATTERNS[slot] + ")")
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
    protected = MIDDLE_INITIAL.sub(lambda m: m.group(1) + "\u2024", protected)
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
                # A sentence's opening clauses are also said on their own:
                # "I went to work for Lockheed, and ..." says "I went to work for Lockheed."
                for cut in list(CLAUSE_BREAK.finditer(sentence))[:4]:
                    clause = sentence[: cut.start()].rstrip(",")
                    if len(clause.split()) >= 3:
                        yield clause + ("?" if sentence.endswith("?") else ".")
                # A quoted line inside a sentence may close with a comma: He said, "Still at the mill?"
                for lead in ("Well, ", "Oh, ", "Yeah, ", "Yes, ", "No, ", "And ", "So "):
                    if sentence.startswith(lead) and len(sentence) > len(lead) + 2:
                        yield sentence[len(lead)].upper() + sentence[len(lead) + 1 :]


def documents_in(root):
    for source in sorted(os.listdir(root)):
        folder = os.path.join(root, source)
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            if not name.endswith(".txt"):
                continue
            meta_path = os.path.join(folder, name[:-4] + ".json")
            if os.path.exists(meta_path):
                yield os.path.join(folder, name), meta_path


CANDIDATES = []
BY_FIRST = {}
# Each candidate's longest literal word: a sentence without it can't match.
NEEDS = []


def scan(paths):
    """The candidates one document says as whole sentences."""
    text_path, meta_path = paths
    # A document still being written (a helper mid-download) is skipped.
    try:
        with open(meta_path, encoding="utf-8") as handle:
            meta = json.load(handle)
        with open(text_path, encoding="utf-8", errors="replace") as handle:
            text = handle.read()
    except (OSError, ValueError):
        return None, set()
    found = set()
    for sentence in set(sentences(text)):
        if len(sentence) > 160:
            continue
        lowered = sentence.lower()
        first = re.match(r"[A-Za-z']+", sentence)
        keys = ["*"] + ([first.group(0).lower()] if first else [])
        for key in keys:
            for index in BY_FIRST.get(key, ()):
                if index in found:
                    continue
                if NEEDS[index] not in lowered:
                    continue
                match = CANDIDATES[index][3].match(sentence)
                if match and all(
                    names_a_record(name.split("__")[0], fill) for name, fill in match.groupdict().items()
                ):
                    found.add(index)
    return meta, found


ORAL_HISTORY = re.compile(r"oral histor|interview|\b(?:nasa2?|house|nps|nih|senate|nara|military|wpa)\b", re.I)


def is_oral_history(meta):
    return bool(ORAL_HISTORY.search(f"{meta.get('source', '')} {meta.get('title', '')}"))


# Words the repository's American-English guard flags even in a source title
# (tests/american-english.test.ts); such a title is replaced by its collection.
GUARDED = re.compile(
    r"\b(?:councillors?|(?:dis|multi)?colour\w*|neighbour\w*|favour\w*|behaviour\w*|honour\w*|labour\w*|centres?|programmes?|licences?|defences?|travell\w*|cheques?|kerbs?|tyres?|grey\w*|fortnights?|rotas?|mum\w*|petrol|high streets?|car parks?|local authorit\w*|elected members?|minist(?:ers?|ry|ries)|wards?)\b",
    re.IGNORECASE,
)


def document_name(meta):
    title = meta.get("title") or meta.get("source") or ""
    if not GUARDED.search(title):
        return title
    return f"{meta.get('source', 'Federal record')} of {meta.get('date') or 'unknown date'}"


def spoken_in_era(meta):
    """A hearing is dated by when it was printed; its Congress says when it was held."""
    congress = re.match(r"CHRG-(\d+)", meta.get("id", ""))
    return not congress or int(congress.group(1)) >= 114


def load_candidates(spec):
    candidates = []
    for group in spec["groups"]:
        for candidate in group["candidates"]:
            text = candidate if isinstance(candidate, str) else candidate["text"]
            # A sentence that is only a slot names a record; it is not speech.
            if not re.sub(r"\{\w+\}|[\s.,?!]", "", text):
                continue
            extra = {} if isinstance(candidate, str) else {k: v for k, v in candidate.items() if k != "text"}
            pattern = template_regex(text)
            if spec.get("ignoreCase"):
                pattern = re.compile(pattern.pattern, re.IGNORECASE)
            candidates.append((group, text, extra, pattern))
    return candidates


def build_bank(spec, shapes_path, candidates, seen, documents):
    """The bank for one shapes file, and the shapes no record says enough."""
    minimum = spec.get("minDocuments", 2)
    # One part per sentence: a sentence that serves several groups (the same
    # "I'm still at {employer}." raising work and replying about it) is one
    # part listing every use, so each text ships once.
    parts, rejected = [], []
    by_text = {}
    used_keys = collections.Counter()
    for index, (group, text, extra, _) in candidates:
        use = {k: v for k, v in group.items() if k not in ("kind", "candidates", "note")}
        use.update(extra)
        if text in by_text:
            if use not in by_text[text]["uses"]:
                by_text[text]["uses"].append(use)
            continue
        docs = list(seen[index].values())
        # A bank may count only some collections (the opening speech counts
        # only what Presidents said).
        if spec.get("sources"):
            docs = [d for d in docs if d.get("source") in spec["sources"]]
        modern = sorted(
            (
                d
                for d in docs
                if (d.get("date") or "") >= ERA_START
                and PUBLIC_DOMAIN.match(d.get("url", ""))
                and "public domain" in d.get("license", "").lower()
                and spoken_in_era(d)
            ),
            # Cite a record the government wrote or said itself (hearings, the
            # Record, agency releases and meetings) before an oral history,
            # whose interviewee may have given rather than lacked their rights.
            key=lambda d: (not is_oral_history(d), d["date"], d["id"]),
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
            "source": {
                "document": document_name(source),
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
            "notAttested": len(rejected),
        },
        "parts": parts,
    }
    return bank, {"register": spec["register"], "read": bank["mining"]["read"], "notAttested": rejected}


def main():
    # Several banks in one pass over the corpus:
    #   mine-shapes.py --many <bank-dir> <report-dir> <corpus-dir> <shapes.json> ...
    # One bank to standard output:
    #   mine-shapes.py <shapes.json> <corpus-dir> [report.json] > bank.json
    many = sys.argv[1] == "--many"
    if many:
        bank_dir, report_dir, corpus_root = sys.argv[2:5]
        shapes_paths = sys.argv[5:]
    else:
        shapes_paths, corpus_root = [sys.argv[1]], sys.argv[2]
    with multiprocessing.get_context("fork").Pool() as pool:
        learn_proper_nouns(corpus_root, pool)
    specs = []
    for shapes_path in shapes_paths:
        with open(shapes_path, encoding="utf-8") as handle:
            spec = json.load(handle)
        start = len(CANDIDATES)
        CANDIDATES.extend(load_candidates(spec))
        specs.append((shapes_path, spec, range(start, len(CANDIDATES))))
    # A quick first-word index and a required word keep the scan fast.
    for index, (_, text, _, _) in enumerate(CANDIDATES):
        first = re.match(r"[A-Za-z']+", text)
        BY_FIRST.setdefault(first.group(0).lower() if first and not text.startswith("{") else "*", []).append(index)
        words = re.findall(r"[A-Za-z']+", re.sub(r"\{\w+\}", " ", text))
        NEEDS.append(max(words, key=len).lower() if words else "")

    seen = collections.defaultdict(dict)  # candidate index -> doc id -> meta
    documents = collections.Counter()
    with multiprocessing.get_context("fork").Pool() as pool:
        for meta, found in pool.imap_unordered(scan, list(documents_in(corpus_root)), chunksize=8):
            if meta is None:
                continue
            documents[meta.get("source", "?")] += 1
            for index in found:
                seen[index][meta["id"]] = meta

    for shapes_path, spec, indices in specs:
        bank, report = build_bank(spec, shapes_path, [(i, CANDIDATES[i]) for i in indices], seen, documents)
        if many:
            with open(os.path.join(bank_dir, spec["register"] + ".json"), "w", encoding="utf-8") as handle:
                json.dump(bank, handle, indent=2, ensure_ascii=False)
                handle.write("\n")
            with open(os.path.join(report_dir, f"not-attested-{spec['register']}.json"), "w", encoding="utf-8") as handle:
                json.dump(report, handle, indent=1)
                handle.write("\n")
            continue
        json.dump(bank, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
        # The shapes no record says twice go to a report beside the research notes.
        if len(sys.argv) > 3:
            with open(sys.argv[3], "w", encoding="utf-8") as handle:
                json.dump(report, handle, indent=1)
                handle.write("\n")


def slug(text):
    words = re.sub(r"\{(\w+)\}", lambda m: m.group(1).replace("_", "-"), text.lower())
    words = re.sub(r"[^a-z0-9 \-]", "", words.replace("'", ""))
    return "-".join(words.split())[:48].strip("-")


if __name__ == "__main__":
    main()
