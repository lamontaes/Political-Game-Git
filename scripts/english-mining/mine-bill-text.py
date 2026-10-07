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
    ("clause", r"The table of contents for this Act is as follows:", "The table of contents for this Act is as follows:"),
    ("clause", r"In general\.--", "In general.--"),
    ("clause", r"Definitions\.--In this", "Definitions.--In this {scope}:"),
    ("clause", r"Rule of construction\.--", "Rule of construction.--"),
    ("clause", r"Effective date\.--", "Effective date.--"),
    ("clause", r"Authorization of appropriations\.--", "Authorization of appropriations.--"),
    ("clause", r"The term ``[^']+'' means", "The term {name} means {subject}."),
    ("clause", r"The term ``[^']+'' has the meaning given (?:the|such) term in", "The term {name} has the meaning given the term in {provision}."),
    ("clause", r"for each of fiscal years \d{4} through \d{4}", "{amount} for each of fiscal years {period}."),
    ("clause", r"such sums as may be necessary", "There are authorized to be appropriated such sums as may be necessary to carry out this {scope}."),
    ("clause", r"in consultation with the", "{official}, in consultation with {committees}, shall {duty}."),
    ("clause", r"shall promulgate regulations", "The {official} shall promulgate regulations to carry out this {scope}."),
    ("clause", r"may not be used to", "None of the funds made available under this {scope} may be used to {conduct}."),
    ("clause", r"publicly available", "The {official} shall make the report publicly available on the website of {subject}."),
    ("clause", r"The amendment made by this section shall take effect", "The amendment made by this section shall take effect on {period}."),
    ("clause", r"by striking ``[^']+'' each place it appears", "{provision} is amended by striking {oldText} each place it appears and inserting {newText}."),
    ("clause", r"by redesignating ", "{provision} is amended by redesignating {oldText} as {newText}."),
    ("clause", r"by inserting before ", "{provision} is amended by inserting before {anchor} the following:"),
    ("clause", r"in the matter preceding ", "in the matter preceding {anchor}, by striking {oldText} and inserting {newText}."),
    ("clause", r"Not later than \d+ (?:days|year|years) after", "Not later than {period} after {subject}, the {official} shall {duty}."),
    ("clause", r"and annually thereafter", "Not later than {period} after the date of enactment of this Act, and annually thereafter, the {official} shall submit a report."),
    ("clause", r"to the Committee on [A-Z][a-z]+", "to the Committee on {subject} of the {committees}."),
    ("clause", r"the following new paragraph:", "{provision} is amended by adding at the end the following new paragraph:"),
    ("clause", r"the following new subsection:", "{provision} is amended by adding at the end the following new subsection:"),
    ("clause", r"the following new section:", "{provision} is amended by inserting after {anchor} the following new section:"),
    ("clause", r"Congress makes the following findings:", "Congress makes the following findings:"),
    ("long-title", r"To make [^,]+, and for other purposes\.", "To make {purpose}, and for other purposes."),
    ("long-title", r"To expand [^,]+, and for other purposes\.", "To expand {program}, and for other purposes."),
    ("long-title", r"To ensure [^,]+, and for other purposes\.", "To ensure {purpose}, and for other purposes."),
    ("long-title", r"To protect [^,]+, and for other purposes\.", "To protect {subject}, and for other purposes."),
    ("long-title", r"To modify [^,]+, and for other purposes\.", "To modify {provision}, and for other purposes."),
    ("long-title", r"To extend [^,]+, and for other purposes\.", "To extend {program}, and for other purposes."),
    ("long-title", r"To reauthorize [^,]+, and for other purposes\.", "To reauthorize {program}, and for other purposes."),
    ("long-title", r"To clarify [^,]+, and for other purposes\.", "To clarify {provision}, and for other purposes."),
    ("long-title", r"To increase [^,]+, and for other purposes\.", "To increase {subject}, and for other purposes."),
    ("long-title", r"To strengthen [^,]+, and for other purposes\.", "To strengthen {program}, and for other purposes."),
    ("long-title", r"To promote [^,]+, and for other purposes\.", "To promote {purpose}, and for other purposes."),
    ("long-title", r"To support [^,]+, and for other purposes\.", "To support {program}, and for other purposes."),
    ("long-title", r"To reduce [^,]+, and for other purposes\.", "To reduce {subject}, and for other purposes."),
    ("long-title", r"To exempt [^,]+, and for other purposes\.", "To exempt {subject}, and for other purposes."),
    ("long-title", r"To create [^,]+, and for other purposes\.", "To create {program}, and for other purposes."),
    ("long-title", r"Expressing the sense of the (?:House of Representatives|Senate|Congress) that", "Expressing the sense of the {committees} that {view}."),
    ("long-title", r"Recognizing [^,.]+", "Recognizing {subject}."),
    ("long-title", r"Supporting the designation of", "Supporting the designation of {name}."),
    ("short-title", r"This section may be cited as the ``[^']+''\.", "This section may be cited as the {act}."),
    ("short-title", r"This title may be cited as the ``[^']+''\.", "This title may be cited as the {act}."),
    ("short-title", r"Short title\.--", "Short title.--"),
    ("enacting-clause", r"Resolved, That", "Resolved, That {view}."),
    ("enacting-clause", r"Resolved by the House of Representatives \(the Senate concurring\),", "Resolved by the House of Representatives (the Senate concurring),"),
    ("enacting-clause", r"Whereas ", "Whereas {view};"),
    ("enacting-clause", r"Now, therefore, be it", "Now, therefore, be it"),
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
