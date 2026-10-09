# Mines federal transcripts (U.S. government works, public domain): NASA Johnson
# Space Center and U.S. House Office of the Historian oral histories, and the
# testimony in congressional hearings, for how Americans tell their own life story
# in the first person:
# where they were born and grew up, their family, their schooling, their first job,
# whom they met, and the turns that make those facts a story: what connects one
# event to the next ("then", "that's when"), what a moment was like ("it was
# hard"), and the look back ("looking back,", "I was lucky"). Usage:
#   python3 -I mine-oral-history-life.py <dir> [<dir> ...] > life-story.json
# where each <dir> holds one pdftotext .txt per transcript and a .url beside it with
# the transcript's address. A NASA file name ends in its interview date (-M-D-YY);
# otherwise the first full date on the transcript's opening pages is used.
# A shape is kept when at least two separate transcripts use it with their own
# particulars, which become slots. Each kept part cites a transcript from 2015 on.
import re, glob, sys, json, collections

NAME = r"[A-Z][A-Za-z.'-]+"
PLACE = NAME + r"(?:(?:,? | of | )" + NAME + r"){0,3}"
NUMBER = r"(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|\d{1,2})"
YEAR = r"(?:19|20)\d\d"
JOB = r"(?:an? )?[a-z][a-z -]{2,40}"
REL = r"(?:wife|husband)"

# A part is a clause a speaker opens a sentence with, such as "I grew up in
# {place}". The clause counts when the slot's particulars end at a natural break:
# the sentence's end, a comma, or "and", "in", "on", "when" or "until".
BREAK = r"(?=[.,;!?]| and | in | on | when | until | but |$)"
SHAPES = [
    ("birth", "I was born in {place}", r"I was born in " + PLACE + BREAK),
    ("birth", "I was born and raised in {place}", r"I was born and raised in " + PLACE + BREAK),
    ("grew-up", "I grew up in {place}", r"I grew up in " + PLACE + BREAK),
    ("grew-up", "I grew up there", r"I grew up there" + BREAK),
    ("move", "we moved to {place}", r"[Ww]e moved to " + PLACE + BREAK),
    ("move", "we lived in {place}", r"[Ww]e lived in " + PLACE + BREAK),
    ("move", "we lived there until I was {age}", r"[Ww]e lived there until I was (?:about )?" + NUMBER + BREAK),
    ("move", "I lived there until I was {age}", r"I lived there until I was (?:about )?" + NUMBER + BREAK),
    ("family", "my father was {occupation}", r"[Mm]y father was an? [a-z]+(?: [a-z]+){0,3}" + BREAK),
    ("family", "my dad was {occupation}", r"[Mm]y dad was an? [a-z]+(?: [a-z]+){0,3}" + BREAK),
    ("family", "my mother was {occupation}", r"[Mm]y mother was an? [a-z]+(?: [a-z]+){0,3}" + BREAK),
    ("family", "my mom was {occupation}", r"[Mm]y mom was an? [a-z]+(?: [a-z]+){0,3}" + BREAK),
    ("family", "I was the oldest of {number} children", r"I was the oldest of " + NUMBER + r" (?:children|kids)" + BREAK),
    ("family", "I was the youngest of {number} children", r"I was the youngest of " + NUMBER + r" (?:children|kids)" + BREAK),
    ("family", "I was an only child", r"I was an only child" + BREAK),
    ("school", "I graduated from high school", r"I graduated from high school" + BREAK),
    ("school", "I graduated from {school}", r"I graduated from " + PLACE + BREAK),
    ("school", "I went to high school in {place}", r"I went to high school in " + PLACE + BREAK),
    ("school", "I went to college at {school}", r"I went to college at " + PLACE + BREAK),
    ("work", "my first job was {job}", r"[Mm]y first job was (?:as )?an? [a-z]+(?: [a-z]+){0,3}" + BREAK),
    ("work", "my first job was at {employer}", r"[Mm]y first job was (?:at|with) " + PLACE + BREAK),
    ("work", "I went to work for {employer}", r"I went to work for " + PLACE + BREAK),
    ("work", "I worked there for {number} years", r"I worked there for (?:about )?" + NUMBER + r" years" + BREAK),
    ("people", "I met my {relation}", r"I met my " + REL + BREAK),
    ("people", "that's where I met my {relation}", r"[Tt]hat's where I met my " + REL + BREAK),
    ("people", "we got married", r"[Ww]e got married" + BREAK),
    ("settle", "I've been here ever since", r"I've been here ever since" + BREAK),
    ("settle", "that's how I ended up in {place}", r"[Tt]hat's how I (?:ended|wound) up (?:in|at) " + PLACE + BREAK),
    # Family and place, as a narrator sets the scene.
    ("family", "I have {number} siblings", r"I (?:have|had) " + NUMBER + r" (?:older |younger )?siblings" + BREAK),
    ("family", "I have {number} brothers", r"I (?:have|had) " + NUMBER + r" (?:older |younger )?brothers" + BREAK),
    ("family", "I have {number} sisters", r"I (?:have|had) " + NUMBER + r" (?:older |younger )?sisters" + BREAK),
    ("family", "I was raised by my {guardian}", r"I was raised by my (?:mother|grandmother|grandparents|father|aunt|grandfather)" + BREAK),
    ("loss", "my {parent} died", r"[Mm]y (?:mother|mom|father|dad) died" + BREAK),
    ("place", "I grew up in a small town", r"I grew up in a (?:very )?small town" + BREAK),
    ("place", "I grew up on a farm", r"I grew up on a (?:\w+ )?farm" + BREAK),
    # The turns between events. A narrator opens the next event with one; its
    # blank is the clause for that event, from this bank.
    ("connect", "then {clause}", r"Then (?:I|we)\b"),
    ("connect", "after that, {clause}", r"After that, (?:I|we)\b"),
    ("connect", "eventually, {clause}", r"Eventually, (?:I|we)\b"),
    ("cause", "that's when {clause}", r"That's when (?:I|we)\b"),
    ("look-back", "looking back, {clause}", r"Looking back, (?:I|we|it)\b"),
    # What a moment was like, said whole right after it.
    ("weigh", "it was hard", r"It was hard\.$"),
    ("weigh", "it was tough", r"It was tough\.$"),
    ("weigh", "it was difficult", r"It was difficult\.$"),
    ("weigh", "it was a big deal", r"It was a big deal\.$"),
    ("weigh", "it was a lot of fun", r"It was a lot of fun\.$"),
    ("weigh", "I loved it", r"I loved it\.$"),
    # How the narrator sees it now.
    ("reflect", "I was lucky", r"I was lucky\.$"),
    ("reflect", "I was very lucky", r"I was very lucky\.$"),
    ("reflect", "I was very fortunate", r"I was very fortunate\.$"),
    ("reflect", "I'll never forget it", r"I'll never forget it\.$"),
]

# A tail is a clause a speaker hangs on the end of another, anywhere in a
# sentence: "we moved to Ohio when I was twelve". The composer joins a tail to
# the clause it qualifies.
TAILS = [
    ("when", "when I was {age}", r"\bwhen I was (?:about )?" + NUMBER + r"(?: years old)?" + BREAK),
]

def date_of(name):
    m = re.search(r"-(\d{1,2})-(\d{1,2})-(\d\d)$", name)
    if not m:
        return None
    month, day, year = int(m.group(1)), int(m.group(2)), 2000 + int(m.group(3))
    if year > 2030:
        year -= 100
    return f"{year:04d}-{month:02d}-{day:02d}"

def sentences(text):
    return re.split(r"(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<=[.?!])\s+(?=[A-Z])", text)

MONTHS = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], 1)}

def date_in(text):
    """The first full date on a transcript's opening pages: when it was recorded."""
    m = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), ((?:19|20)\d\d)", text[:6000], re.I)
    return f"{int(m.group(3)):04d}-{MONTHS[m.group(1).capitalize()]:02d}-{int(m.group(2)):02d}" if m else None

def document_of(url):
    if "govinfo.gov" in url:
        return "Congressional hearing transcript"
    if "house.gov" in url:
        return "U.S. House of Representatives, Office of the Historian, oral history transcript"
    return "NASA Johnson Space Center Oral History Project transcript"

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
        text = re.sub(r"\s+", " ", open(path, errors="ignore").read()).replace("\u2019", "'")
        date = date_of(name) or date_in(text)
        for sentence in sentences(text):
            sentence = sentence.strip()
            if len(sentence.split()) > 40:
                continue
            for shapes, find in ((SHAPES, re.match), (TAILS, re.search)):
                for move, shape, pattern in shapes:
                    if find(pattern, sentence):
                        docs[shape].add(name)
                        if date and date >= "2015-01-01" and shape not in cite:
                            cite[shape] = (date, url, name)

def key(move, shape):
    words = re.sub(r"\{(\w+)\}", r"\1", shape).lower().replace("'", "")
    return "life-story." + move + "." + "-".join(re.sub(r"[^a-z]+", "-", words).strip("-").split("-")[:8])

parts = []
for move, shape, _ in SHAPES + TAILS:
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
    "register": "life-story",
    "description": "How Americans tell their own life story in the first person, mined from federal transcripts (public domain): NASA Johnson Space Center and U.S. House oral histories and congressional hearing testimony. Each part is a clause a speaker opens a sentence with, or a tail (move when) a speaker hangs on the end of one; its particulars (places, schools, employers, jobs) are slots filled from a person's records. The moves connect, cause and look-back open a sentence whose blank is another clause from this bank; weigh and reflect are whole sentences said about a moment or a stretch of life. transcriptsUsing counts the transcripts that use it.",
    "slots": {
        "place": "A place from the person's records, as it is named, such as West Jordan, Utah.",
        "school": "The school the person finished, from their education records.",
        "employer": "The employer the person went to work for, from their work records.",
        "occupation": "What a parent did for a living, from the parent's work records, with its article, such as a cashier.",
        "relation": "The person's spouse or partner by relationship, such as wife or husband.",
        "age": "The person's age in years at the time, from their birth date and the record's date, spelled as a newspaper does: words up to twelve.",
        "number": "A count from the person's records, such as their brothers and sisters, spelled as a newspaper does.",
        "guardian": "Who raised the person when it was not both parents, by relationship, such as grandmother, from the household records.",
        "parent": "A parent by relationship, father or mother, from the kinship records.",
        "clause": "Another clause from this bank, for the next event in the person's records.",
    },
    "maxWords": 10,
    "mining": {
        "tool": "scripts/english-mining/mine-oral-history-life.py",
        "read": f"{read} transcripts: NASA Johnson Space Center Oral History Project, U.S. House Office of the Historian oral histories, and congressional hearings from 2015 to 2024 on govinfo.gov.",
        "rule": "A clause is kept when at least two transcripts open a sentence with it, with their own particulars, and one of them is from 2015 or later.",
        "shapesSeen": {shape: len(d) for shape, d in docs.items()},
    },
    "parts": parts,
}
print(json.dumps(bank, indent=2, ensure_ascii=False))
