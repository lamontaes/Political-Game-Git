"""The vote-ask move set's pieces, spliced into the scene-talk bank (words
composer, unit 7; docs/design/words-composer.md; data/english/scene-move-sets.json).

A member asks another for their vote on a bill, or the player asks a
colleague (legislature.ts: the sponsor's count the evening before the roll,
vote-ahead; a section added, bill-amendment; a committee hearing). The scene
is said about the bill's records (src/director/ask-vote-facts.ts): {bill},
{about}, the section just added ({section-about}), the side wanted (want-yes,
want-no), whether the asker brought it (asker-sponsor) and whether the roll
is tomorrow (vote-tomorrow). The variants (whip, trade, watched, friend) are
chosen from the records; their reads mark openers here. The ending is read
by legislature.ts keepReply (a yes given is the member's vote, a refusal a
strain). Every slot a piece says is a fact it requires.

  python3 scripts/words/vote-ask-pieces.py           # splice
  python3 scripts/words/vote-ask-pieces.py --dry     # counts only
Run prettier on the bank after.
"""
import json
import re
import sys

BANK = "data/english/parts/scene-talk.json"
SETS = "data/english/scene-move-sets.json"
GRADES = "data/english/part-grades.json"
SET = "vote-ask"
# The purposes whose counted lines this set replaces.
REPLACES = {
    "ask-vote", "ask-vote.whip", "ask-vote.trade", "ask-vote.watched",
    "ask-vote.friend",
}
AUTHOR = "Words builder (words composer unit 8, vote-ask move set)"
DATE = "2026-11-12"
INSERT = re.compile(r"\{[^{}\s]+\}")
# A slot always on the scene's record: not repeated in requires.
ALWAYS = set()

P = []


def add(step, move, role, part, bearing, rows, requires=(), after=None, group=None):
    for text in rows:
        # Every slot a piece says is a fact it requires.
        need = list(requires) + [
            slot for slot in INSERT.findall(text)
            if slot[1:-1] not in requires and slot[1:-1] not in ALWAYS
        ]
        need = [n[1:-1] if n.startswith("{") else n for n in need]
        # A rounded figure ("about $500") is never read back in a question.
        for q in re.findall(r"[^.?!]*\?", text):
            pass
        # A rounded figure takes no article: never "the {gift}".
        P.append((step, move, role, part, text, sorted(set(need)), after, bearing, group))


A, R = "asked", "asker"
WHY = None
YES, NO = "want-yes", "want-no"

# ---- the opening ----
add("open", "greet", R, "core", "calm", [
    "Got a minute about {bill}?",
    "Before you go, it's about {bill}.",
])
add("open", "greet", R, "core", "calm", [
    "It's about {bill}, and the roll is tomorrow.",
], ["vote-tomorrow"])

# ---- the ask (state: request) ----
add("state", "request", R, "core", "calm", [
    "I need your yes on {bill}.",
    "Can I count you as a yes on {bill}?",
    "I'm asking you to vote for {bill}.",
], [YES])
add("state", "request", R, "core", "calm", [
    "I need you to vote {bill} down.",
    "Can I count you as a no on {bill}?",
], [NO])
add("state", "request", R, "core", "calm", [
    "Where are you on {bill}? I need the vote.",
])
add("state", "request", R, "opener", "calm", [
    "It's my bill, so I'll ask straight.",
    "I brought {bill}, and I'm counting.",
], ["asker-sponsor"])
add("state", "request", R, "opener", "calm", [
    "The roll's tomorrow.",
    "We vote tomorrow, and I'm short.",
], ["vote-tomorrow"])
add("state", "request", R, "opener", "calm", [
    "The section on {section-about} is in now.",
], ["section-about"])
add("state", "request", R, "opener", "calm", [
    "I'm asking for the leadership.",
], ["read-holds-post"])
add("state", "request", R, "opener", "calm", [
    "I was there for you on yours.",
], ["read-favor-given"])
add("state", "request", R, "opener", "calm", [
    "People back home are watching this one.",
], ["read-town-for-bill"])
add("state", "request", R, "opener", "calm", [
    "We go back, so I'll just ask.",
], ["read-close"])

# ---- the answers of the one asked ----
add("reply", "agree", A, "core", "calm", [
    "You have my yes on {bill}.",
    "Put me down for {bill}.",
], [YES])
add("reply", "agree", A, "core", "calm", [
    "You have my no on {bill}.",
], [NO])
add("reply", "agree", A, "core", "calm", [
    "Alright. I'm with you on {bill}.",
])
add("reply", "relent", A, "core", "calm", [
    "Fine. I'll be with you on {bill}.",
    "Alright, you've got me on {bill}.",
])
add("reply", "refuse", A, "core", "braced", [
    "I can't vote for {bill}.",
    "No. Not on {bill}.",
], [YES])
add("reply", "refuse", A, "core", "braced", [
    "I'm voting for {bill}, and that won't change.",
], [NO])
add("reply", "refuse", A, "core", "braced", [
    "I can't give you {bill}.",
])
add("reply", "decline", A, "core", "guarded", [
    "I won't work against {bill}, but I can't vote for it.",
    "I'll stay out of your way on {bill}. That's all I can do.",
])
add("reply", "bargain", A, "core", "guarded", [
    "Drop the section on {section-about}, and I'm with you.",
], ["section-about"])
add("reply", "bargain", A, "core", "guarded", [
    "What do I get for a yes on {bill}?",
    "I'll think about {bill} if you'll think about mine.",
])
add("reply", "stall", A, "core", "guarded", [
    "Let me read {bill} again tonight.",
    "Ask me again before the roll on {bill}.",
])
add("reply", "lie", A, "core", "calm", [
    "Sure. Count me in on {bill}.",
    "Don't worry about me on {bill}.",
])
add("reply", "deflect", A, "core", "guarded", [
    "Who else are you asking about {bill}?",
    "Let's see how {bill} comes out of committee.",
])
add("reply", "leave", A, "core", "guarded", [
    "I have to go. We'll talk about {bill} later.",
    "Not now. Catch me before the roll on {bill}.",
])
add("reply", "answer", A, "core", "calm", [
    "Honestly? I haven't decided on {bill}.",
    "I'm still reading {bill}.",
])
add("reply", "confront", A, "core", "braced", [
    "Is this about {bill}, or about your count?",
    "You didn't ask what I thought of {bill}. You asked for a number.",
])
add("reply", "confess", A, "core", "contrite", [
    "Fine. I'm not with you on {bill}.",
])
add("reply", "apologize", A, "core", "contrite", [
    "I'm sorry. I can't on {bill}.",
])
add("reply", "disagree", A, "core", "guarded", [
    "I don't see {bill} the way you do.",
    "I read {about} differently.",
])
add("reply", "ask", A, "core", "calm", [
    "Why does {bill} matter so much to you?",
])

# ---- the one asking answers ----
add("follow", "thank", R, "core", "calm", [
    "Thank you. I'll count you on {bill}.",
    "Good. That's one more for {bill}.",
])
add("follow", "accept", R, "core", "calm", [
    "Fair enough. I'll find the vote on {bill} somewhere else.",
    "Alright. I won't push you on {bill}.",
])
add("follow", "press", R, "core", "braced", [
    "{bill} is one vote short. Yours.",
    "I need an answer on {bill}, not a maybe.",
])
add("follow", "press", R, "core", "braced", [
    "The roll on {bill} is tomorrow. I need it tonight.",
], ["vote-tomorrow"])
add("follow", "plea", R, "core", "anxious", [
    "I put a year into {bill}. Please.",
], ["asker-sponsor"])
add("follow", "plea", R, "core", "anxious", [
    "Please. {bill} needs one more.",
    "I wouldn't ask if {bill} didn't need you.",
])
add("follow", "threaten", R, "core", "braced", [
    "People will remember who sank {bill}.",
    "Your bill comes up too. Remember {bill}.",
])
add("follow", "bargain", R, "core", "guarded", [
    "Vote for {bill}, and I'll be there on yours.",
    "Give me {bill}, and name what you need.",
])
add("follow", "refuse", R, "core", "braced", [
    "I can't trade on {bill}.",
])
add("follow", "answer", R, "core", "calm", [
    "{bill} is about {about}. That matters to me.",
    "Because of {about}. That's all it is.",
])
add("follow", "confront", R, "core", "braced", [
    "You said the same about {bill} last week.",
], ["read-close"])
add("follow", "promise", R, "core", "calm", [
    "I'll remember this on {bill}.",
])
add("follow", "deflect", R, "core", "guarded", [
    "Leave the count to me. I'm asking about {bill}.",
])

# ---- the close ----
add("close", "thank", R, "core", "calm", [
    "Thanks. See you at the roll on {bill}.",
])
add("close", "accept", R, "core", "calm", [
    "Then I'll leave {bill} with you.",
])
add("close", "warn", R, "core", "braced", [
    "I'll remember {bill} when yours comes up.",
    "Think about {bill} tonight.",
])
add("close", "press", R, "core", "braced", [
    "Call me before the roll on {bill}.",
])

# The owner's liked lines, carried as openers (key and grade kept).
LIKED_AS = {}
LIKED_AFTER = {}
SIDED = {}


SLOTS = {
    "section-about": "What the section just added to a bill is about (\"a higher minimum wage\"), from the amendment record's question.",
}


def piece_keys():
    """Each authored piece's key by its text, numbered as main() numbers them."""
    seen, keys = {}, {}
    for step, move, _role, _part, text, *_ in P:
        n = seen[(step, move)] = seen.get((step, move), 0) + 1
        keys[text] = f"scene-talk.{step}-{move}.{SET}-{n}"
    return keys


def main():
    dry = "--dry" in sys.argv
    keys = piece_keys()
    for text, after in list(LIKED_AFTER.items()):
        if after.startswith("@"):
            LIKED_AFTER[text] = keys[after[1:]]
    bank = json.load(open(BANK))
    grades = json.load(open(GRADES))["parts"]
    fam = lambda u: (u.get("purpose") or "") in REPLACES
    counted = lambda x: (
        not INSERT.search(x["text"]) and len(x["text"].split()) > 3 and "piece" not in x
    )
    kept, deleted, trimmed, carried = [], 0, 0, 0
    for x in bank["parts"]:
        # A second run replaces the set's own pieces rather than adding twins.
        if x["key"].startswith(f"scene-talk.{SET}.") or f".{SET}-" in x["key"]:
            continue
        # A carried liked opener: its conditions as this script last set them.
        if x["text"] in LIKED_AS and x.get("piece", {}).get("of", "").startswith(f"{SET}."):
            for u in x["uses"]:
                if u.get("set") == SET:
                    u.pop("requiresFacts", None)
                    u.pop("after", None)
                    if LIKED_AS[x["text"]]:
                        u["requiresFacts"] = LIKED_AS[x["text"]]
                    if x["text"] in LIKED_AFTER:
                        u["after"] = LIKED_AFTER[x["text"]]
        # A whole line of the purpose that states a side says it only for that side.
        if x["text"] in SIDED:
            for u in x["uses"]:
                if fam(u):
                    u["requiresFacts"] = sorted(set(u.get("requiresFacts", []) + SIDED[x["text"]]))
        # Where the ask's record names a bill, the ask is about it: a whole
        # ask that does not say the bill is said only where none is named.
        for u in x["uses"]:
            if fam(u) and u["step"] == "state" and "{bill}" not in x["text"]:
                u["excludesFacts"] = sorted(set(u.get("excludesFacts", []) + ["bill"]))
        mine = [u for u in x["uses"] if fam(u)]
        if not mine or not counted(x):
            kept.append(x)
            continue
        liked = grades.get(x["key"], {}).get("good", 0) > 0
        if liked and x["text"] in LIKED_AS:
            u = mine[0]
            use = {
                "subject": "scene",
                "set": SET,
                "step": u["step"],
                "move": u["move"],
                "role": u["role"],
            }
            if u["step"] == "open":
                use["key"] = "vote-wanted"
            if LIKED_AS[x["text"]]:
                use["requiresFacts"] = LIKED_AS[x["text"]]
            if x["text"] in LIKED_AFTER:
                use["after"] = LIKED_AFTER[x["text"]]
            x["uses"] = [use] + [v for v in x["uses"] if not fam(v)]
            x["piece"] = {"of": f"{SET}.{u['step']}-{u['move']}", "part": "opener"}
            kept.append(x)
            carried += 1
            continue
        if len(mine) == len(x["uses"]):
            deleted += 1
            continue
        x["uses"] = [u for u in x["uses"] if not fam(u)]
        trimmed += 1
        kept.append(x)
    seen = {}
    for step, move, role, part, text, requires, after, bearing, group in P:
        n = seen[(step, move)] = seen.get((step, move), 0) + 1
        uses = []
        for one in after if isinstance(after, list) else [after]:
            use = {"subject": "scene", "set": SET, "step": step, "move": move, "role": role}
            # The opening is the ask's own.
            if step == "open":
                use["key"] = "vote-wanted"
            if one:
                use["after"] = one
            if requires:
                use["requiresFacts"] = requires
            uses.append(use)
        piece = {"of": f"{SET}.{group or f'{step}-{move}'}", "part": part}
        if part == "core" or (WHY and group == WHY and part == "reason"):
            piece["required"] = True
            assert part != "core" or INSERT.search(text), text
        kept.append(
            {
                "key": f"scene-talk.{step}-{move}.{SET}-{n}",
                "move": f"{step}-{move}",
                "kind": "spoken" if role != "narrator" else "written",
                "text": text,
                "uses": uses,
                "origin": "authored",
                "author": AUTHOR,
                "date": DATE,
                "tag": {"move": move, "key": SET},
                "bearing": bearing,
                "piece": piece,
            }
        )
    print(
        f"deleted {deleted}; trimmed {trimmed} shared lines; carried {carried} liked lines; added {len(P)} pieces"
    )
    if dry:
        return
    for slot, about in SLOTS.items():
        bank["slots"].setdefault(slot, about)
    bank["parts"] = kept
    with open(BANK, "w") as out:
        json.dump(bank, out, indent=2, ensure_ascii=False)
        out.write("\n")


main()
