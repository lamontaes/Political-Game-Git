# Mines federal transcripts (U.S. government works, public domain): NASA Johnson
# Space Center and U.S. House Office of the Historian oral histories, and the
# testimony in congressional hearings, for the words of a denial and of the
# answers that show whether the listener believed it: the lie a player can tell
# in conversation, and the tell, what the other person says back when they do
# not believe it, or when they do.
# Usage:
#   python3 -I mine-lie-and-tell.py <dir> [<dir> ...] > lie-and-tell.json
# where each <dir> holds one pdftotext .txt per transcript and a .url beside it
# with the transcript's address. A NASA file name ends in its interview date
# (-M-D-YY); otherwise the first full date on the transcript's opening pages is
# used.
#
# A line counts when a whole sentence says it, spoken in the interview or
# quoted from a conversation the speaker remembers. A line is kept when at
# least two separate transcripts say it, and one of them is from 2015 or later.
# The moves:
#   deny    - a flat denial of something that happened ("That's not true.")
#   doubt   - the listener does not believe what was just said ("Is that true?")
#   accept  - the listener takes it ("Fair enough.")
# Whether a listener doubts is not decided here: the game decides it from what
# the listener knows, never by chance.
import re, glob, sys, json, collections

SHAPES = [
    ("deny", "That's not true.", r"That's not true\."),
    ("deny", "That is not true.", r"That is not true\."),
    ("deny", "That's not correct.", r"That's not correct\."),
    ("deny", "That is not correct.", r"That is not correct\."),
    ("deny", "That's not accurate.", r"That's not accurate\."),
    ("deny", "That never happened.", r"That never happened\."),
    ("deny", "Absolutely not.", r"Absolutely not\."),
    ("deny", "Not at all.", r"Not at all\."),
    ("deny", "Of course not.", r"Of course not\."),
    ("deny", "I did not.", r"I did not\."),
    ("deny", "No, I didn't.", r"No, I didn't\."),
    ("deny", "I wasn't there.", r"I wasn't there\."),
    ("deny", "I have no idea.", r"I have no idea\."),
    ("deny", "I never said that.", r"I never said that\."),
    ("doubt", "Is that true?", r"Is that true\?"),
    ("doubt", "Is that right?", r"Is that right\?"),
    ("doubt", "Really?", r"Really\?"),
    ("doubt", "Are you sure?", r"Are you sure\?"),
    ("doubt", "Are you sure about that?", r"Are you sure about that\?"),
    ("doubt", "Seriously?", r"Seriously\?"),
    ("doubt", "Come on.", r"Come on[.!]"),
    ("doubt", "I doubt it.", r"I doubt it\."),
    ("doubt", "I don't believe that.", r"I don't believe that\."),
    ("doubt", "I don't believe you.", r"I don't believe you\."),
    ("doubt", "I'm not sure about that.", r"I'm not sure about that\."),
    ("doubt", "I don't think so.", r"I don't think so\."),
    ("accept", "Fair enough.", r"Fair enough\."),
    ("accept", "All right.", r"All right\."),
    ("accept", "That makes sense.", r"That makes sense\."),
    ("accept", "Good to know.", r"Good to know\."),
    ("accept", "I believe you.", r"I believe you\."),
    ("accept", "If you say so.", r"If you say so\."),
]
COMPILED = [(move, text, re.compile(pattern + r"$")) for move, text, pattern in SHAPES]

MONTHS = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], 1)}


def date_of(name):
    m = re.search(r"-(\d{1,2})-(\d{1,2})-(\d\d)$", name)
    if not m:
        return None
    month, day, year = int(m.group(1)), int(m.group(2)), 2000 + int(m.group(3))
    if year > 2030:
        year -= 100
    return f"{year:04d}-{month:02d}-{day:02d}"


def date_in(text):
    m = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), ((?:19|20)\d\d)", text[:6000], re.I)
    return f"{int(m.group(3)):04d}-{MONTHS[m.group(1).capitalize()]:02d}-{int(m.group(2)):02d}" if m else None


def document_of(url):
    if "govinfo.gov" in url:
        return "Congressional hearing transcript"
    if "house.gov" in url:
        return "U.S. House of Representatives, Office of the Historian, oral history transcript"
    return "NASA Johnson Space Center Oral History Project transcript"


def sentences(text):
    said = re.split(r"(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<=[.?!])\s+(?=[A-Z\"])", text)
    for quoted in re.findall(r"\"([^\"]{1,200})\"", text):
        said.extend(re.split(r"(?<=[.?!,])\s+(?=[A-Z])", quoted.strip()))
    for sentence in said:
        sentence = re.sub(r"^[A-Z]{2,}(?: [A-Z]{2,})*:\s*", "", sentence.strip().strip("\"").strip())
        sentence = re.sub(r",$", ".", sentence)
        if sentence:
            yield sentence


docs = collections.defaultdict(set)
cite = {}
read = 0
for folder in sys.argv[1:]:
    for path in sorted(glob.glob(folder + "/*.txt")):
        name = path.rsplit("/", 1)[-1][:-4]
        try:
            url = open(path[:-4] + ".url").read().strip()
        except FileNotFoundError:
            continue
        read += 1
        text = re.sub(r"\s+", " ", open(path, errors="ignore").read())
        text = text.replace("’", "'").replace("“", "\"").replace("”", "\"")
        date = date_of(name) or date_in(text)
        for sentence in sentences(text):
            if len(sentence) > 60:
                continue
            for move, shape, pattern in COMPILED:
                if pattern.match(sentence):
                    docs[shape].add(name)
                    if date and date >= "2015-01-01" and shape not in cite:
                        cite[shape] = (date, url, name)


def key(move, shape):
    words = shape.lower().replace("'", "")
    slug = "-".join(re.sub(r"[^a-z]+", "-", words).strip("-").split("-")[:8])
    return f"lie-and-tell.{move}.{slug}"


parts = []
for move, shape, _ in SHAPES:
    if len(docs.get(shape, ())) < 2 or shape not in cite:
        continue
    date, url, name = cite[shape]
    parts.append({
        "key": key(move, shape),
        "move": move,
        "kind": "spoken",
        "text": shape,
        "transcriptsUsing": len(docs[shape]),
        "shippable": True,
        "source": {"document": document_of(url), "date": date, "granule": name, "url": url},
    })
bank = {
    "schema": "english-parts/1",
    "register": "lie-and-tell",
    "description": "The words of a denial, and of the answers that show whether the listener believed it, mined from federal transcripts (public domain): NASA Johnson Space Center and U.S. House oral histories and congressional hearing testimony. deny is the lie a speaker tells about something that happened; doubt is what a listener says who does not believe it; accept is what a listener says who does. Whether a listener doubts is the game's decision, from what the listener knows. transcriptsUsing counts the transcripts that say it.",
    "slots": {},
    "maxWords": 6,
    "mining": {
        "tool": "scripts/english-mining/mine-lie-and-tell.py",
        "read": f"{read} transcripts: NASA Johnson Space Center Oral History Project, U.S. House Office of the Historian oral histories, and congressional hearings from 2015 to 2024 on govinfo.gov.",
        "rule": "A line is kept when at least two transcripts say it as a whole sentence, and one of them is from 2015 or later.",
        "shapesSeen": {shape: len(d) for shape, d in sorted(docs.items())},
    },
    "parts": parts,
}
print(json.dumps(bank, indent=2, ensure_ascii=False))
