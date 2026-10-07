# Counts how Voice of America staff stories are written: sentence and paragraph
# length, how often a sentence quotes someone, and which attribution words carry
# the quote. Counts only; no sentence ships. Stories that name a wire service
# (Associated Press, Reuters, AFP) are skipped, since only VOA staff work is a
# federal work. Usage: python3 -I count-voa-news.py <dir with index.txt and *.html>
import re, sys, html, json, statistics

d = sys.argv[1]
WIRE = re.compile(r"Associated Press|Reuters|Agence France|AFP", re.I)
ATTRIB = ["said", "says", "told", "added", "according to", "noted", "wrote", "asked", "stated", "explained"]
OPENERS = ["the", "in", "a", "but", "on", "president", "this", "it", "that", "after"]
stories, paras, sents, leads = 0, [], [], []
quoted, attrib, opener, dates = 0, {a: 0 for a in ATTRIB}, {o: 0 for o in OPENERS}, []
for line in open(d + "/index.txt"):
    url, name = line.split()
    try:
        page = open(f"{d}/{name}", errors="ignore").read()
    except FileNotFoundError:
        continue
    m = re.search(r'class="wsw[^"]*"(.*?)</div>\s*</div>', page, re.S)
    date = re.search(r'"datePublished":"(\d{4}-\d\d-\d\d)', page)
    if not m or not date or WIRE.search(page):
        continue
    body = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", p))).strip() for p in re.findall(r"<p[^>]*>(.*?)</p>", m.group(1), re.S)]
    body = [p for p in body if len(p.split()) >= 4]
    if len(body) < 3:
        continue
    stories += 1
    dates.append(date.group(1))
    for i, p in enumerate(body):
        ss = [s for s in re.split(r"(?<!\b[A-Z])(?<!Mr)(?<!Ms)(?<!Dr)(?<!Sen)(?<!Rep)(?<=[.?!\"”])\s+(?=[A-Z“\"])", p) if s]
        paras.append(len(ss))
        for s in ss:
            w = len(s.split())
            sents.append(w)
            if i == 0 and s is ss[0]:
                leads.append(w)
            if re.search(r"[\"“”]", s):
                quoted += 1
            low = s.lower()
            for a in ATTRIB:
                if re.search(rf"\b{a}\b", low):
                    attrib[a] += 1
            first = re.sub(r"[^a-z]", "", low.split()[0]) if low.split() else ""
            if first in opener:
                opener[first] += 1
n = len(sents)
out = {
    "stories": stories,
    "sentences": n,
    "paragraphs": len(paras),
    "medianSentenceWords": statistics.median(sents),
    "medianLeadSentenceWords": statistics.median(leads),
    "medianSentencesPerParagraph": statistics.median(paras),
    "shareParagraphsOneSentence": round(sum(1 for p in paras if p == 1) / len(paras), 3),
    "shareSentencesQuoting": round(quoted / n, 3),
    "attributionPer1000Sentences": {a: round(1000 * c / n, 1) for a, c in sorted(attrib.items(), key=lambda x: -x[1])},
    "sentenceOpenersPer1000Sentences": {o: round(1000 * c / n, 1) for o, c in sorted(opener.items(), key=lambda x: -x[1])},
}
print(json.dumps({"counts": out, "dates": [min(dates), max(dates)]}, indent=2))
