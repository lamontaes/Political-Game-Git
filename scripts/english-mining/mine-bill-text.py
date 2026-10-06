# Mines congressional bill text (govinfo BILLS packages, public domain) for sourced
# legislation-wording parts: generic section headings and drafting formulas.
# Usage: python3 -I mine-bill-text.py <dir of BILLS-*.htm> > parts.jsonl
# Bill text: https://www.govinfo.gov/content/pkg/<BILLS-id>/html/<BILLS-id>.htm
import re, glob, html, sys, json, collections, datetime

MONTHS = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], 1)}

FORMULAS = [
    ("enacting-clause", r"Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled,", "Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled,"),
    ("short-title", r"This Act may be cited as the ``[^']+''\.", "This Act may be cited as the {act}."),
    ("short-title", r"This Act may be cited as the ``[^']+'' or the ``[^']+''\.", "This Act may be cited as the {act} or the {shortAct}."),
    ("long-title", r"To amend [^,]+? to [^,]+, and for other purposes\.", "To amend {act} to {purpose}, and for other purposes."),
    ("long-title", r"To require [^,]+, and for other purposes\.", "To require {requirement}, and for other purposes."),
    ("long-title", r"To establish [^,]+, and for other purposes\.", "To establish {program}, and for other purposes."),
    ("long-title", r"To provide for [^,]+, and for other purposes\.", "To provide for {purpose}, and for other purposes."),
    ("long-title", r"To prohibit [^,]+, and for other purposes\.", "To prohibit {conduct}, and for other purposes."),
    ("long-title", r"To direct the [^,]+? to [^,]+, and for other purposes\.", "To direct the {official} to {duty}, and for other purposes."),
    ("long-title", r"To authorize [^,]+, and for other purposes\.", "To authorize {action}, and for other purposes."),
    ("long-title", r"To improve [^,]+, and for other purposes\.", "To improve {program}, and for other purposes."),
    ("long-title", r"To repeal [^,]+, and for other purposes\.", "To repeal {provision}, and for other purposes."),
    ("long-title", r"To designate the facility of the United States Postal Service located at .+? as the .+?\.", "To designate the facility of the United States Postal Service located at {address} as the {name}."),
    ("clause", r"In this (?:section|Act):", "In this {scope}:"),
    ("clause", r"Not later than \d+ (?:days|years?) after the date of (?:the )?enactment of this Act, the .{3,80}? shall", "Not later than {period} after the date of enactment of this Act, the {official} shall"),
    ("clause", r"There (?:is|are) authorized to be appropriated", "There is authorized to be appropriated {amount} to carry out this {scope}."),
    ("clause", r"Nothing in this (?:section|Act) (?:shall be construed|may be construed)", "Nothing in this {scope} shall be construed to {limit}."),
    ("clause", r"is amended by striking ", "{provision} is amended by striking {oldText} and inserting {newText}."),
    ("clause", r"is amended by adding at the end the following:", "{provision} is amended by adding at the end the following:"),
    ("clause", r"is amended by inserting .{1,80}? after ", "{provision} is amended by inserting {newText} after {anchor}."),
    ("clause", r"is amended to read as follows:", "{provision} is amended to read as follows:"),
    ("clause", r"is repealed\.", "{provision} is repealed."),
    ("clause", r"shall take effect on the date (?:of|that is \d+ days after the date of) (?:the )?enactment of this Act", "This {scope} shall take effect on the date of enactment of this Act."),
    ("clause", r"shall apply to .{3,60}? beginning after the date of the enactment of this Act", "The amendments made by this {scope} shall apply to {subject} beginning after the date of the enactment of this Act."),
    ("clause", r"It is the sense of Congress that", "It is the sense of Congress that {view}."),
    ("clause", r"Congress finds the following:", "Congress finds the following:"),
    ("clause", r"submit to the .{3,120}? a report", "the {official} shall submit to {committees} a report on {subject}."),
    ("clause", r"Except as provided in", "Except as provided in {provision},"),
    ("clause", r"Subject to the availability of appropriations", "Subject to the availability of appropriations,"),
    ("clause", r"If any provision of this Act.{0,80}?is held to be unconstitutional", "If any provision of this Act is held to be unconstitutional, the remainder of this Act shall not be affected."),
]

def text_of(path):
    t = html.unescape(open(path, errors="ignore").read())
    t = re.sub(r"<[^>]+>", "", t)
    return re.sub(r"\s+", " ", t)

def bill_date(t):
    m = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (20\d\d)", t)
    if not m:
        return None
    return datetime.date(int(m.group(3)), MONTHS[m.group(1)], int(m.group(2))).isoformat()

heads = collections.defaultdict(list)
forms = collections.defaultdict(list)
for f in sorted(glob.glob(sys.argv[1] + "/*.htm")):
    bid = f.split("/")[-1][:-4]
    t = text_of(f)
    date = bill_date(t)
    if not date:
        continue
    src = {"document": "Congressional bill text", "date": date, "granule": bid, "url": f"https://www.govinfo.gov/app/details/{bid}"}
    for h in set(re.findall(r"SEC(?:TION|\.) \d+\. ([A-Z][A-Z ,'-]{2,60}?)\.", t)):
        if len(h.split()) <= 8:
            heads[h].append(src)
    for i, (move, rx, shape) in enumerate(FORMULAS):
        if re.search(rx, t):
            forms[i].append(src)

out = []
for h, srcs in heads.items():
    if len(srcs) >= 2:
        out.append({"move": "section-heading", "text": h.capitalize() + ".", "count": len(srcs), "source": srcs[0]})
for i, srcs in forms.items():
    move, _, shape = FORMULAS[i]
    out.append({"move": move, "text": shape, "count": len(srcs), "source": srcs[0]})
for row in sorted(out, key=lambda r: (r["move"], -r["count"], r["text"])):
    print(json.dumps(row))
