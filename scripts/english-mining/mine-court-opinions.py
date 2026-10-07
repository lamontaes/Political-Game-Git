# Mines U.S. Supreme Court slip opinions (public domain) for sourced judicial-wording
# parts. Usage: python3 -I mine-court-opinions.py <dir> > parts.jsonl, where <dir> holds
# page.html (https://www.supremecourt.gov/opinions/slipopinion/<term>) and one
# pdftotext .txt per opinion PDF linked from it, named after the PDF.
import re, glob, sys, json, collections, datetime

FORMULAS = [
    ("disposition", r"It is so ordered\.", "It is so ordered."),
    ("disposition", r"judgment of the .{3,80}? is reversed, and the case is remanded for further proceedings consistent with this opinion\.", "The judgment of the {court} is reversed, and the case is remanded for further proceedings consistent with this opinion."),
    ("disposition", r"judgment of the .{3,80}? is vacated, and the case is remanded for further proceedings consistent with this opinion\.", "The judgment of the {court} is vacated, and the case is remanded for further proceedings consistent with this opinion."),
    ("disposition", r"judgment of the .{3,80}? is affirmed\.", "The judgment of the {court} is affirmed."),
    ("disposition", r"The writ of certiorari is dismissed as improvidently granted\.", "The writ of certiorari is dismissed as improvidently granted."),
    ("disposition", r"\bWe (?:now )?reverse\.", "We reverse."),
    ("disposition", r"\bWe (?:now )?affirm\.", "We affirm."),
    ("disposition", r"\bWe (?:now )?vacate and remand\.", "We vacate and remand."),
    ("disposition", r"For the foregoing reasons, ", "For the foregoing reasons, {disposition}."),
    ("disposition", r"\bFor these reasons, ", "For these reasons, {disposition}."),
    ("holding", r"\bWe hold that ", "We hold that {holding}."),
    ("holding", r"\bWe conclude that ", "We conclude that {conclusion}."),
    ("holding", r"\bToday, the Court holds that ", "Today, the Court holds that {holding}."),
    ("holding", r"\bWe granted certiorari", "We granted certiorari to resolve {question}."),
    ("holding", r"\bThe question (?:presented )?(?:in this case )?is whether ", "The question presented is whether {question}."),
    ("holding", r"\bThe answer is no\.", "The answer is no."),
    ("holding", r"\bThe answer is yes\.", "The answer is yes."),
    ("holding", r"\bWe agree\.", "We agree."),
    ("holding", r"\bWe disagree\.", "We disagree."),
    ("reasoning", r"\bThat argument fails\.", "That argument fails."),
    ("reasoning", r"\bThe same is true here\.", "The same is true here."),
    ("reasoning", r"\bSo it is here\.", "So it is here."),
    ("reasoning", r"\bTo be sure, ", "To be sure, {concession}."),
    ("reasoning", r"\bIn short, ", "In short, {summary}."),
    ("reasoning", r"\bPut (?:differently|another way), ", "Put differently, {restatement}."),
    ("reasoning", r"\bThat is not the end of the matter\.", "That is not the end of the matter."),
    ("reasoning", r"\bWe begin with the text", "We begin with the text."),
    ("reasoning", r"\bThat reading is (?:mistaken|wrong)", "That reading is mistaken."),
    ("reasoning", r"\bNothing in (?:the|our) (?:text|decision|opinion) ", "Nothing in the {scope} {limit}."),
    ("reasoning", r"\bThe Government (?:responds|argues) that ", "The {party} argues that {argument}."),
    ("reasoning", r"\bConsider ", "Consider {example}."),
    ("separate-opinion", r"\bI respectfully dissent\.", "I respectfully dissent."),
    ("separate-opinion", r"\bRespectfully, I dissent\.", "Respectfully, I dissent."),
    ("separate-opinion", r"\bI join the Court's opinion in full", "I join the Court's opinion in full."),
    ("separate-opinion", r"\bI write separately to ", "I write separately to {point}."),
    ("separate-opinion", r"\bI concur in the judgment", "I concur in the judgment."),
    ("separate-opinion", r"\bThe Court today ", "The Court today {action}."),
    ("separate-opinion", r"\bThe majority (?:holds|concludes) that ", "The majority holds that {holding}."),
    ("separate-opinion", r"\bWith respect, ", "With respect, {objection}."),
    ("disposition", r"\bWe therefore reverse", "We therefore reverse."),
    ("disposition", r"\bWe therefore affirm", "We therefore affirm."),
    ("disposition", r"\bAccordingly, the judgment", "Accordingly, the judgment of the {court} is reversed."),
    ("disposition", r"is reversed in part", "The judgment of the {court} is affirmed in part and reversed in part."),
    ("disposition", r"\bThe petition for a writ of certiorari is granted", "The petition for a writ of certiorari is granted."),
    ("disposition", r"\bThe application for stay", "The application for stay is denied."),
    ("disposition", r"\bThe judgment is reversed", "The judgment is reversed."),
    ("disposition", r"\bThe judgment is affirmed", "The judgment is affirmed."),
    ("holding", r"\bWe think not\.", "We think not."),
    ("holding", r"\bWe do not agree\.", "We do not agree."),
    ("holding", r"\bWe decline to ", "We decline to {action}."),
    ("holding", r"\bWe need not decide ", "We need not decide {question}."),
    ("holding", r"\bWe express no view", "We express no view on {question}."),
    ("holding", r"\bThe Court of Appeals erred", "The {court} erred."),
    ("holding", r"\bIt follows that ", "It follows that {conclusion}."),
    ("reasoning", r"\bWe are not persuaded\.", "We are not persuaded."),
    ("reasoning", r"\bThat is not so\.", "That is not so."),
    ("reasoning", r"\bNot so\.", "Not so."),
    ("reasoning", r"\bThat is wrong\.", "That is wrong."),
    ("reasoning", r"\bThat makes sense\.", "That makes sense."),
    ("reasoning", r"\bThe text says no such thing", "The text says no such thing."),
    ("reasoning", r"\bThe statute's text", "The statute's text {limit}."),
    ("reasoning", r"\bOur precedents ", "Our precedents {action}."),
    ("reasoning", r"\bAt the same time, ", "At the same time, {concession}."),
    ("reasoning", r"\bOf course, ", "Of course, {concession}."),
    ("reasoning", r"\bFor one thing, ", "For one thing, {argument}."),
    ("reasoning", r"\bFor another, ", "For another, {argument}."),
    ("reasoning", r"\bIn any event, ", "In any event, {summary}."),
    ("reasoning", r"\bMore to the point, ", "More to the point, {argument}."),
    ("reasoning", r"\bThat is especially so", "That is especially so here."),
    ("reasoning", r"\bWe have long held", "We have long held that {holding}."),
    ("reasoning", r"\bThis case is different", "This case is different."),
    ("separate-opinion", r"\bI join the opinion of the Court", "I join the opinion of the Court."),
    ("separate-opinion", r"\bI agree with the Court that ", "I agree with the Court that {holding}."),
    ("separate-opinion", r"\bI would reverse", "I would reverse."),
    ("separate-opinion", r"\bI would affirm", "I would affirm."),
    ("separate-opinion", r"\bI would hold that ", "I would hold that {holding}."),
    ("separate-opinion", r"\bI cannot agree", "I cannot agree."),
    ("separate-opinion", r"\bI do not agree", "I do not agree."),
    ("separate-opinion", r"\bThe Court's decision ", "The Court's decision {action}."),
    ("separate-opinion", r"\bThe majority's ", "The majority's {scope} {limit}."),
    ("separate-opinion", r"\bconcurring in part and dissenting in part", "I concur in part and dissent in part."),
]

d = sys.argv[1]
meta = {}
for row in re.findall(r"<tr.*?</tr>", open(d + "/page.html", errors="ignore").read(), re.S):
    m = re.search(r"opinions/(\d+pdf)/([^\"]+)\.pdf", row)
    t = re.search(r">\s*(\d{1,2})/(\d{1,2})/(\d{2})\s*<", row)
    if m and t:
        date = datetime.date(2000 + int(t.group(3)), int(t.group(1)), int(t.group(2))).isoformat()
        meta[m.group(2)] = {"document": "Supreme Court of the United States slip opinion", "date": date, "granule": m.group(2), "url": f"https://www.supremecourt.gov/opinions/{m.group(1)}/{m.group(2)}.pdf"}

hits = collections.defaultdict(list)
for f in sorted(glob.glob(d + "/*.txt")):
    name = f.split("/")[-1][:-4]
    if name not in meta:
        continue
    t = open(f, errors="ignore").read().replace("’", "'")
    t = re.sub(r"-\n(?=[a-z])", "", t)
    t = re.sub(r"\s+", " ", t)
    for i, (_, rx, _) in enumerate(FORMULAS):
        if re.search(rx, t):
            hits[i].append(meta[name])

for i, srcs in sorted(hits.items(), key=lambda x: (FORMULAS[x[0]][0], -len(x[1]))):
    move, _, shape = FORMULAS[i]
    print(json.dumps({"move": move, "text": shape, "count": len(srcs), "source": srcs[0]}))
