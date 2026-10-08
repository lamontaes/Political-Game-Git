# Mines Congressional Record day folders (unzipped CREC-YYYY-MM-DD.zip, House and
# Senate pages only; public domain) for how members credit or blame a named official
# for what the official did. Usage:
#   python3 -I mine-official-credit-blame.py <dir of CREC-* day folders> > official-views.json
# Day zips: https://www.govinfo.gov/content/pkg/CREC-YYYY-MM-DD.zip
# A shape is kept when a member's floor speech uses it, with a named official in the
# official slot, on at least two separate days. The particulars (who, for what) become
# slots; the words around them are exactly as spoken.
import re, glob, html, sys, json, collections

SPEAKER = re.compile(r"^(?:Mr|Ms|Mrs)\. [A-Z][A-Z'-]+(?: of [A-Z][a-z]+(?: [A-Z][a-z]+)?)?\. (.+)$")
TITLE = (r"(?:President|Vice President|Governor|Lieutenant Governor|Mayor|Senator|Chairman|"
         r"Chairwoman|Chair|Speaker|Leader|Secretary|Representative|Congressman|Congresswoman|"
         r"Commissioner|Administrator|Attorney General|Ranking Member|Judge|Sheriff)")
# A named official: a title, optionally with a name; or a colleague by state.
OFFICIAL = (r"(?:the |our |my )?(?:" + TITLE + r"(?: [A-Z][a-zA-Z'.-]+){0,3}"
            r"|(?:gentleman|gentlewoman|colleague|friend) from [A-Z][a-z]+(?: [A-Z][a-z]+)?)")
REST = r"[^.;:!?\"()]{3,90}"
# "Madam Speaker, I thank ..." is "I thank ..." addressed to the chair.
ADDRESS = re.compile(r"^(?:Madam|Mr\.) (?:Speaker|President|Chair|Chairman|Chairwoman), ")

# (move, kind, shape, pattern). The pattern must match the whole sentence.
SHAPES = [
    ("credit", "spoken", "I thank {official} for {action}.", r"I thank " + OFFICIAL + r" for " + REST + r"\."),
    ("credit", "spoken", "I want to thank {official} for {action}.", r"I want to thank " + OFFICIAL + r" for " + REST + r"\."),
    ("credit", "spoken", "I would like to thank {official} for {action}.", r"I would like to thank " + OFFICIAL + r" for " + REST + r"\."),
    ("credit", "spoken", "I commend {official} for {action}.", r"I commend " + OFFICIAL + r" for " + REST + r"\."),
    ("credit", "spoken", "I applaud {official} for {action}.", r"I applaud " + OFFICIAL + r" for " + REST + r"\."),
    ("credit", "spoken", "I am grateful to {official} for {action}.", r"I am (?:so |very )?grateful to " + OFFICIAL + r" for " + REST + r"\."),
    ("credit", "spoken", "I congratulate {official} on {action}.", r"I congratulate " + OFFICIAL + r" on " + REST + r"\."),
    ("credit", "spoken", "{official} deserves credit for {action}.", OFFICIAL + r" deserves (?:a lot of |great )?credit for " + REST + r"\."),
    ("credit", "spoken", "I appreciate {official}'s leadership on this issue.", r"I (?:really )?appreciate " + OFFICIAL + r"'s leadership on this issue\."),
    ("credit", "spoken", "{official} has done a great job.", OFFICIAL + r" has done a (?:great|terrific|tremendous|fantastic) job\."),
    ("blame", "spoken", "{official} has failed to {action}.", OFFICIAL + r" (?:has|have) failed to " + REST + r"\."),
    ("blame", "spoken", "{official} has failed {community}.", OFFICIAL + r" (?:has|have) failed (?:the|our) " + REST + r"\."),
    ("blame", "spoken", "I blame {official} for {outcome}.", r"I blame " + OFFICIAL + r" for " + REST + r"\."),
    ("blame", "spoken", "{official} is to blame for {outcome}.", OFFICIAL + r" (?:is|are) to blame for " + REST + r"\."),
    ("blame", "spoken", "{official} is responsible for {outcome}.", OFFICIAL + r" (?:is|are) (?:directly )?responsible for " + REST + r"\."),
    ("blame", "spoken", "The blame lies with {official}.", r"The blame (?:lies|rests) (?:squarely )?with " + OFFICIAL + r"\."),
    ("blame", "spoken", "{official} broke that promise.", OFFICIAL + r" broke (?:that|this|his|her|their) promise\."),
    ("blame", "spoken", "{official} chose to {action}.", OFFICIAL + r" chose to " + REST + r"\."),
]

def paragraphs(text):
    text = re.sub(r"<[^>]+>", "", html.unescape(text))
    out, cur = [], None
    for line in text.split("\n"):
        if re.match(r"^  \S", line):
            if cur: out.append(cur)
            cur = line.strip()
        elif line.strip() and cur is not None:
            cur += " " + line.strip()
        else:
            if cur: out.append(cur)
            cur = None
    if cur: out.append(cur)
    return out

def sentences(text):
    return re.split(r"(?<!\bMr)(?<!\bMs)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<=[.?!])\s+(?=[A-Z])", text)

days = collections.defaultdict(set)
first = {}
for path in sorted(glob.glob(sys.argv[1] + "/CREC-*/**/*.htm", recursive=True)):
    granule = path.split("/")[-1][:-4]
    day = granule[5:15]
    speaking = False
    for para in paragraphs(open(path, errors="ignore").read()):
        # A member's speech runs from their name to the next speaker; later
        # paragraphs of the same speech carry no name.
        spoken = SPEAKER.match(para)
        if spoken:
            speaking, para = True, spoken.group(1)
        elif re.match(r"^The (?:SPEAKER|PRESIDING OFFICER|CHAIR|ACTING PRESIDENT)", para):
            speaking = False
        if not speaking:
            continue
        for sentence in sentences(para):
            sentence = ADDRESS.sub("", sentence.strip())
            if len(sentence.split()) > 24:
                continue
            for move, kind, shape, pattern in SHAPES:
                if re.fullmatch(pattern, sentence):
                    days[shape].add(day)
                    first.setdefault(shape, (day, granule))

def key(move, shape):
    words = re.sub(r"\{(\w+)\}", r"\1", shape).lower()
    return "official-views." + move + "." + re.sub(r"[^a-z]+", "-", words).strip("-")

parts = []
for move, kind, shape, _ in SHAPES:
    used = len(days.get(shape, ()))
    if used < 2:
        continue
    day, granule = first[shape]
    parts.append({
        "key": key(move, shape),
        "move": move,
        "kind": kind,
        "text": shape,
        "daysUsing": used,
        "shippable": True,
        "source": {
            "document": "Congressional Record",
            "date": day,
            "granule": granule,
            "url": "https://www.govinfo.gov/app/details/CREC-" + day + "/" + granule,
        },
    })

read = sorted({d for s in days.values() for d in s})
seen = {shape: len(d) for shape, d in days.items()}
print(json.dumps({"parts": parts, "daysWithAHit": len(read), "shapesSeen": seen}, indent=2))
