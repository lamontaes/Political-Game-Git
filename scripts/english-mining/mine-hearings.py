# Mines congressional hearing transcripts (govinfo CHRG packages, public domain) for
# sourced hearing-register parts: how members and witnesses thank, answer, agree,
# confirm and keep time. Usage: python3 -I mine-hearings.py <dir of CHRG-*.htm>
# Hearing text: https://www.govinfo.gov/content/pkg/<CHRG-id>/html/<CHRG-id>.htm
import re, glob, html, sys, json, collections, datetime

MONTHS = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], 1)}
MOVES = {
    "thanks": ["Thank you.", "Thank you very much.", "Thank you so much.", "Thank you, sir.", "Well, thank you.", "Thank you, Mr. Chairman.", "Thank you, Madam Chair.", "Thank you, Chairman.", "Thank you, Senator.", "Thank you, Chair.", "Thank you all.", "Thanks, Mr. Chairman.", "Oh, thank you.", "I thank you.", "I thank the gentleman.", "Thank you for that.", "Thank you for that answer.", "Thank you, gentlemen."],
    "answer": ["Thank you for the question.", "Thank you for that question.", "Thank you for your question.", "Thank you for the question, sir.", "Thank you for the question, Senator.", "Senator, thank you for that question.", "Thank you for that question, Senator.", "That is a great question.", "Yes, thank you for that.", "Yes, thank you."],
    "agree": ["I agree.", "I completely agree.", "I couldn't agree more.", "I appreciate that.", "I appreciate it.", "Appreciate that.", "I appreciate that very much.", "Very good.", "That is great.", "That would be great.", "I understand.", "I got you.", "I know."],
    "confirm": ["Yes, sir.", "Yes, ma'am.", "Yes, Senator.", "No, sir.", "No, Senator.", "That is correct.", "That is correct, sir.", "Yes, that is correct.", "That is right.", "Yes, absolutely.", "Absolutely, yes.", "Absolutely, Senator.", "Of course.", "I do.", "Yes, I do.", "It does.", "It is."],
    "repair": ["I am sorry.", "Excuse me.", "I apologize."],
    "chair-procedure": ["Without objection, so ordered.", "Without objection.", "The gentleman yields back.", "The gentlelady yields back.", "The gentlewoman yields back.", "The gentleman yields.", "The gentleman's time has expired.", "Good morning.", "Good afternoon.", "All right."],
    "time": ["I yield back.", "I yield back, Mr. Chairman.", "Mr. Chairman, I yield back.", "I yield.", "My time has expired.", "My time is up."],
}
SPEAKER = re.compile(r"^\s{4}(?:Chairman|Chairwoman|Chair|Senator|Mr\.|Ms\.|Mrs\.|Dr\.|Representative|General|Secretary|Admiral)\s?[A-Z][A-Za-z'-]+\.\s+(.*)", re.S)

def hearing_date(t):
    m = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (20\d\d)", t)
    return datetime.date(int(m.group(3)), MONTHS[m.group(1)], int(m.group(2))).isoformat() if m else None

hits = collections.defaultdict(list)
for f in sorted(glob.glob(sys.argv[1] + "/CHRG-*.htm")):
    hid = f.split("/")[-1][:-4]
    t = html.unescape(re.sub(r"<[^>]+>", "", open(f, errors="ignore").read()))
    date = hearing_date(t)
    if not date:
        continue
    src = {"document": "Congressional hearing transcript", "date": date, "granule": hid, "url": f"https://www.govinfo.gov/app/details/{hid}"}
    seen = set()
    for para in re.split(r"\n(?=    \S)", t):
        m = SPEAKER.match(para)
        if not m:
            continue
        body = re.sub(r"\s+", " ", m.group(1))
        for s in re.split(r"(?<!Mr\.)(?<!Ms\.)(?<!Mrs\.)(?<!Dr\.)(?<=[.?!])\s+", body)[:3]:
            for move, texts in MOVES.items():
                if s in texts:
                    seen.add((move, s))
    for key in seen:
        hits[key].append(src)

for move, texts in MOVES.items():
    for text in texts:
        srcs = hits.get((move, text), [])
        if len(srcs) >= 2:
            print(json.dumps({"move": move, "text": text, "count": len(srcs), "source": srcs[0]}))
