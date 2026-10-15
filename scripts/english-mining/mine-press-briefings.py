# Mines White House press briefing transcripts (U.S. government works, public domain)
# for sourced press-register parts: short recurring turns of the press secretary and
# of reporters, sorted into move types. Usage: python3 -I mine-press-briefings.py <dir>,
# where <dir> holds b<N>.html briefing pages and b<N>.url with each page's address.
import re, glob, html, sys, json, collections

MOVES = {
    "opener": ["Good afternoon, everyone.", "Good afternoon, everybody.", "Hi, everybody.", "So, a couple of things.", "So, look, a couple of things.", "So, a couple things."],
    "take-question": ["Go ahead.", "Go ahead, sir.", "Final question.", "Last question.", "Say that one more time.", "Wait, say that one more time.", "Hold on."],
    "deflect": ["I'm not going to get into hypotheticals.", "I'm not going to get into hypotheticals from here.", "I'm not going to get ahead of the president.", "I don't have anything beyond that.", "We'll have more to share.", "Don't have anything to share with you at this time.", "I'm not going to speak to that.", "I'm not going to get into specifics.", "I just don't have anything.", "I'm just not going to do that from here.", "I'm not going to do that.", "That's what I can speak to."],
    "stance": ["We've been very clear about that.", "Our policy has not changed.", "That stands.", "That is our commitment.", "It is not unusual.", "That is not unusual.", "That's what we want to see.", "That's what they deserve.", "And I think that's important to note."],
    "reaction": ["All right.", "Yeah, sure.", "No, no, no.", "No, no.", "No, not at all.", "Yeah, yeah.", "I hear you.", "Appreciate it.", "I appreciate the effort.", "I'm sorry.", "I apologize.", "Oh, sorry.", "No problem.", "Oh, okay.", "Sorry, guys."],
    "closer": ["Thanks, everybody.", "Thanks, everyone.", "Thank you so much."],
    "reporter-question": ["Two questions.", "Just one more question.", "And then on a different topic.", "Why is that?", "Why not?", "Can you address that?", "Good to see you.", "Nice to see you.", "Thank you.", "Good afternoon.", "Yeah, thanks."],
}
REPORTER = {"reporter-question"}
SECRETARY = re.compile(r"^(?:MS|MR)\. [A-Z][A-Z' -]+:\s*(.*)")

d = sys.argv[1]
hits = collections.defaultdict(list)
for f in sorted(glob.glob(d + "/b*.html"), key=lambda p: int(re.sub(r"\D", "", p.split("/")[-1]))):
    url = open(f[:-5] + ".url").read().strip()
    m = re.search(r"/(20\d\d)/(\d\d)/(\d\d)/", url)
    src = {"document": "White House press briefing", "date": f"{m.group(1)}-{m.group(2)}-{m.group(3)}", "url": url}
    t = html.unescape(re.sub(r"<[^>]+>", "\n", open(f, errors="ignore").read())).replace("’", "'")
    seen = set()
    for para in t.split("\n"):
        para = para.strip()
        sec = SECRETARY.match(para)
        q = re.match(r"^Q\s+(.*)", para)
        if not (sec or q):
            continue
        for s in re.split(r"(?<=[.?!])\s+", (sec or q).group(1)):
            for move, texts in MOVES.items():
                if s.strip() in texts and (move in REPORTER) == bool(q):
                    seen.add((move, s.strip()))
    for key in seen:
        hits[key].append(src)

for move, texts in MOVES.items():
    for text in texts:
        srcs = hits.get((move, text), [])
        if len(srcs) >= 2:
            print(json.dumps({"move": move, "text": text, "count": len(srcs), "source": srcs[0]}))
