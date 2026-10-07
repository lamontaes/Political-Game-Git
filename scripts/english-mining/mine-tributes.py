# Mines the Extensions of Remarks in Congressional Record day zips (public domain)
# for sourced tribute parts: how members honor, congratulate and remember people
# and places. Usage: python3 -I mine-tributes.py <dir holding *PgE*.htm>
# Day zips: https://www.govinfo.gov/content/pkg/CREC-YYYY-MM-DD.zip
import re, glob, html, sys, json, collections

S = r"(?:Mr\.|Madam) Speaker, "
SHAPES = [
    ("opener", S + r"I rise today to honor ", "{chair}, I rise today to honor {honoree}."),
    ("opener", S + r"I rise today to recognize ", "{chair}, I rise today to recognize {honoree}."),
    ("opener", S + r"I rise today to congratulate ", "{chair}, I rise today to congratulate {honoree} on {occasion}."),
    ("opener", S + r"I rise today to celebrate ", "{chair}, I rise today to celebrate {occasion}."),
    ("opener", S + r"I rise today to commemorate ", "{chair}, I rise today to commemorate {occasion}."),
    ("opener", S + r"I rise today to pay tribute to ", "{chair}, I rise today to pay tribute to {honoree}."),
    ("opener", S + r"I rise today to acknowledge ", "{chair}, I rise today to acknowledge {honoree}."),
    ("opener", S + r"I rise today to remember ", "{chair}, I rise today to remember {honoree}."),
    ("opener", S + r"I rise today in honor of ", "{chair}, I rise today in honor of {honoree}."),
    ("opener", S + r"I rise today in recognition of ", "{chair}, I rise today in recognition of {occasion}."),
    ("opener", S + r"I rise today in memory of ", "{chair}, I rise today in memory of {honoree}."),
    ("opener", S + r"I rise to honor ", "{chair}, I rise to honor {honoree}."),
    ("opener", S + r"I rise to recognize ", "{chair}, I rise to recognize {honoree}."),
    ("opener", S + r"I rise to congratulate ", "{chair}, I rise to congratulate {honoree}."),
    ("opener", S + r"I rise today with a heavy heart", "{chair}, I rise today with a heavy heart to remember {honoree}."),
    ("opener", S + r"I am honored to recognize ", "{chair}, I am honored to recognize {honoree}."),
    ("opener", S + r"I am proud to recognize ", "{chair}, I am proud to recognize {honoree}."),
    ("opener", S + r"I would like to recognize ", "{chair}, I would like to recognize {honoree}."),
    ("opener", S + r"I would like to congratulate ", "{chair}, I would like to congratulate {honoree}."),
    ("opener", S + r"I would like to honor ", "{chair}, I would like to honor {honoree}."),
    ("opener", S + r"I want to recognize ", "{chair}, I want to recognize {honoree}."),
    ("opener", S + r"it is with great pleasure that I ", "{chair}, it is with great pleasure that I recognize {honoree}."),
    ("opener", S + r"it is my honor to ", "{chair}, it is my honor to recognize {honoree}."),
    ("opener", S + r"on (?:Roll Call|roll call) (?:No\.|Number) ", "{chair}, on Roll Call No. {number}, I was not present."),
    ("opener", S + r"I was unable to (?:be present|vote)", "{chair}, I was unable to be present for {vote}."),
    ("opener", S + r"had I been present, I would have voted ", "{chair}, had I been present, I would have voted {position} on {vote}."),
    ("praise", r"\b(?:He|She) is a true ", "{honoree} is a true {role}."),
    ("praise", r"\bThroughout (?:his|her|their) career", "Throughout {honoree}'s career, {honoree} has {achievement}."),
    ("praise", r"\b(?:His|Her|Their) dedication to ", "{honoree}'s dedication to {cause} {achievement}."),
    ("praise", r"\b(?:His|Her|Their) commitment to ", "{honoree}'s commitment to {cause} has made a lasting difference."),
    ("praise", r"\b(?:has|have) made a lasting impact", "{honoree} has made a lasting impact on {community}."),
    ("praise", r"\bserved as a role model", "{honoree} has served as a role model for {community}."),
    ("praise", r"\bis a testament to ", "{achievement} is a testament to {honoree}'s {quality}."),
    ("praise", r"\bwent above and beyond", "{honoree} went above and beyond for {community}."),
    ("praise", r"\btireless", "{honoree} has worked tirelessly for {community}."),
    ("praise", r"\bselfless", "{honoree}'s selfless service has {achievement}."),
    ("praise", r"\bdeeply grateful", "We are deeply grateful for {honoree}'s service."),
    ("praise", r"\bwas born (?:in|on) ", "{honoree} was born in {place}."),
    ("praise", r"\bgraduated from ", "{honoree} graduated from {school}."),
    ("praise", r"\bserved in the (?:United States )?(?:Army|Navy|Air Force|Marine Corps|Coast Guard)", "{honoree} served in the {service}."),
    ("praise", r"\bis survived by ", "{honoree} is survived by {family}."),
    ("praise", r"\b(?:He|She) will be (?:greatly |deeply |sorely )?missed", "{honoree} will be deeply missed."),
    ("praise", r"\bleaves behind a legacy", "{honoree} leaves behind a legacy of {quality}."),
    ("praise", r"\bmy (?:deepest|heartfelt|sincere) condolences", "I offer my deepest condolences to {family}."),
    ("praise", r"\bour thoughts and prayers", "Our thoughts and prayers are with {family}."),
    ("closer", r"\bI ask my colleagues to join me in ", "{chair}, I ask my colleagues to join me in {action}."),
    ("closer", r"\bplease join me in ", "{chair}, please join me in {action}."),
    ("closer", r"\bI urge my colleagues to join me in ", "{chair}, I urge my colleagues to join me in {action}."),
    ("closer", r"\bon behalf of the (?:\d+(?:st|nd|rd|th)|[A-Z][a-z]+) (?:Congressional )?District", "On behalf of {district}, I {action}."),
    ("closer", r"\bI wish (?:him|her|them) (?:all )?the best", "I wish {honoree} the best in {occasion}."),
    ("closer", r"\bcontinued success", "I wish {honoree} continued success."),
    ("closer", r"\bCongratulations(?:,| on| to)", "Congratulations to {honoree} on {occasion}."),
    ("closer", r"\bI am proud to represent ", "I am proud to represent {honoree} in Congress."),
    ("closer", r"\bit is my (?:great )?privilege to ", "It is my privilege to recognize {honoree}."),
    ("closer", r"\bmay (?:he|she) rest in peace", "May {honoree} rest in peace."),
    ("closer", r"\bthank (?:him|her|them) for (?:his|her|their) service", "I thank {honoree} for {honoree}'s service."),
    ("closer", r"\bhappy (?:\d+(?:st|nd|rd|th) )?birthday", "Happy birthday to {honoree}."),
    ("closer", r"\bhappy retirement", "Happy retirement, {honoree}."),
]

def date_of(t):
    m = re.search(r"\((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\w+) (\d+), (\d{4})\)", t)
    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    return f"{m.group(3)}-{months.index(m.group(1)) + 1:02d}-{int(m.group(2)):02d}" if m else None

hits = collections.defaultdict(list)
for f in sorted(glob.glob(sys.argv[1] + "/**/*PgE*.htm", recursive=True)):
    gran = f.split("/")[-1][:-4]
    raw = html.unescape(re.sub(r"<[^>]+>", "", open(f, errors="ignore").read()))
    date = date_of(raw)
    if not date:
        continue
    t = re.sub(r"-\n(?=[a-z])", "", raw)
    t = re.sub(r"\s+", " ", t)
    src = {"document": "Congressional Record, Extensions of Remarks", "date": date, "granule": gran, "url": f"https://www.govinfo.gov/app/details/CREC-{date}/{gran}"}
    for i, (_, rx, _) in enumerate(SHAPES):
        if re.search(rx, t):
            hits[i].append(src)

for i, srcs in sorted(hits.items()):
    move, _, shape = SHAPES[i]
    print(json.dumps({"move": move, "text": shape, "count": len(srcs), "source": srcs[0]}))
