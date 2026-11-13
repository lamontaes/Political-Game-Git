"""The donor move set's pieces, spliced into the scene-talk bank (words
composer, unit 7; docs/design/words-composer.md; data/english/scene-move-sets.json).

A donor who just gave to the player's campaign asks for something back
(campaigns.ts recordGift, the campaign-gift record). The scene is said about
the gift's records (src/director/donor-ask-facts.ts): {gift}, what they have
given in all ({given}), and where a bill before the seat's body is the one
the donor holds the strongest view on, the bill ({bill}, {about}) and the
side the donor wants (want-for, want-against). The variants (small, large,
friend, again) are chosen from the records; their reads mark openers here.
Every slot a piece says is a fact it requires.

  python3 scripts/words/donor-pieces.py           # splice
  python3 scripts/words/donor-pieces.py --dry     # counts only
Run prettier on the bank after.
"""
import json
import re
import sys

BANK = "data/english/parts/scene-talk.json"
SETS = "data/english/scene-move-sets.json"
GRADES = "data/english/part-grades.json"
SET = "donor"
# The purposes whose counted lines this set replaces.
REPLACES = {
    "donor-ask", "donor-ask.small", "donor-ask.large", "donor-ask.friend",
    "donor-ask.again",
}
AUTHOR = "Words builder (words composer unit 7, donor move set)"
DATE = "2026-11-12"
INSERT = re.compile(r"\{[^{}\s]+\}")
# A slot always on the scene's record: not repeated in requires.
ALWAYS = {"gift"}

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
            assert not re.search(r"\{(?:gift|given)\}", q), text
        # A rounded figure takes no article: never "the {gift}".
        assert not re.search(r"\b(?:the|a|an|that|your|my) \{(?:gift|given)\}", text), text
        P.append((step, move, role, part, text, sorted(set(need)), after, bearing, group))


A, R = "asked", "asker"
WHY = None
FOR, AGAINST = "want-for", "want-against"

# ---- the opening: what it is about (open: greet) ----
add("open", "greet", R, "core", "calm", [
    "I'm calling about {bill}.",
    "This is about {bill}.",
])
add("open", "greet", R, "core", "calm", [
    "I gave {gift} to your campaign. I'd like a minute of your time.",
    "I put {gift} into your campaign, and I'd like a word.",
])

# ---- the ask (state: request), said about what the donor wants ----
add("state", "request", R, "core", "calm", [
    "I need you for {bill}.",
    "When {bill} comes up, I'm asking you to be for it.",
    "{bill} matters to me, and I want you behind it.",
], [FOR])
add("state", "request", R, "core", "calm", [
    "I need you against {bill}.",
    "When {bill} comes up, I'm asking you to stand against it.",
    "{bill} would hurt me, and I want you against it.",
], [AGAINST])
add("state", "request", R, "core", "calm", [
    "I'd like you to take a hard look at {bill}.",
    "I want a real hearing on {bill}. That's all I'm asking.",
])
# No bill before the seat: the gift asks for an ear.
add("state", "request", R, "core", "calm", [
    "I gave {gift}. When I call, I'd like you to pick up.",
    "I put {gift} behind you. I'll want your ear when it counts.",
])
# The reason, from the donor's own working life (their job record), for the side they want.
add("state", "request", R, "reason", "calm", [
    "I work at {employer}, and {bill} would help the people I work with.",
], [FOR])
add("state", "request", R, "reason", "calm", [
    "I work at {employer}, and {bill} would cost the people I work with.",
], [AGAINST])
add("state", "request", R, "reason", "calm", [
    "I'm {work} at {employer}. I see who {bill} would help.",
], [FOR])
add("state", "request", R, "reason", "calm", [
    "I'm {work} at {employer}. I see who {bill} would hurt.",
], [AGAINST])
add("state", "request", R, "opener", "calm", [
    "I put {gift} into your campaign.",
    "I just gave {gift} to your campaign.",
])
add("state", "request", R, "opener", "calm", [
    "I've given you {given} all told.",
], ["given"])
add("state", "request", R, "opener", "calm", [
    "We go back a long way, so I'll ask you straight.",
    "I'm asking as a friend first.",
], ["read-close"])
add("state", "request", R, "opener", "braced", [
    "I asked you once already.",
    "Last time you put me off.",
], ["read-put-off-before"])

# ---- the player's answers ----
add("reply", "agree", A, "core", "calm", [
    "I'll take another look at {bill}.",
    "You'll get a fair hearing from me on {bill}.",
    "Send me what you have on {bill}, and I'll read it myself.",
])
add("reply", "agree", A, "core", "calm", [
    "You gave {gift}. The least I owe you is a call back.",
])
add("reply", "relent", A, "core", "calm", [
    "All right. I'll look at {bill} again.",
    "Fine. {bill} gets a second look from me.",
])
add("reply", "offer", A, "core", "calm", [
    "Talk to my office about {bill}. They'll set a time.",
    "Send what you have on {bill} to my office, and we'll sit down.",
])
add("reply", "decline", A, "core", "guarded", [
    "I'll hear you out on {bill}, but {gift} doesn't decide it.",
    "I'm grateful for {gift}. It doesn't buy a position on {bill}.",
    "You'll get a hearing on {bill}. You won't get a promise.",
])
add("reply", "decline", A, "core", "guarded", [
    "I'm grateful for {gift}. It doesn't buy a promise.",
])
add("reply", "refuse", A, "core", "braced", [
    "I don't trade positions on {bill} for checks.",
    "No. Where I stand on {bill} isn't for sale.",
])
add("reply", "refuse", A, "core", "braced", [
    "{gift} is a gift. It doesn't come with my vote.",
])
add("reply", "bargain", A, "core", "guarded", [
    "I can't promise you all of {bill}. Tell me which part matters most.",
    "Give me something on {bill} I can defend, and we'll talk.",
])
add("reply", "deflect", A, "core", "guarded", [
    "Let's talk about {bill} after the election.",
    "{bill} isn't in front of me yet.",
])
add("reply", "deflect", A, "core", "guarded", [
    "Let's get through the election first. {gift} helps with that.",
])
add("reply", "stall", A, "core", "guarded", [
    "Give me a week on {bill}.",
    "I haven't read {bill} closely yet. Ask me again soon.",
])
add("reply", "apologize", A, "core", "contrite", [
    "I'm sorry. I can't be where you want on {bill}.",
    "I'm sorry. Not on {bill}, not even for you.",
])
add("reply", "lie", A, "core", "calm", [
    "I've been with you on {bill} from the start.",
    "Don't worry about {bill}. It's handled.",
])
add("reply", "leave", A, "core", "guarded", [
    "I have to go. Call my office about {bill}.",
    "We're done talking about {bill} today.",
])
add("reply", "leave", A, "core", "guarded", [
    "I have to go. Thank you again for {gift}.",
])
add("reply", "answer", A, "core", "calm", [
    "I'm still reading {bill}. That's my honest answer.",
    "Honestly? I haven't made up my mind on {bill}.",
])
add("reply", "confront", A, "core", "braced", [
    "You gave {gift}. You didn't buy my vote on {bill}.",
    "Is {bill} what the money was for?",
])
add("reply", "confess", A, "core", "contrite", [
    "Fine. I haven't decided on {bill}.",
])

# ---- the donor answers ----
add("follow", "thank", R, "core", "calm", [
    "Thank you. That's all I wanted on {bill}.",
    "Good. I'll send you what I have on {bill}.",
])
add("follow", "thank", R, "core", "calm", [
    "Thank you. That's worth more to me than {gift}.",
])
add("follow", "accept", R, "core", "calm", [
    "Fair enough. A hearing on {bill} is something.",
    "All right. I'll call your office about {bill}.",
    "Then I'll make my case on {bill} to your staff.",
])
add("follow", "accept", R, "core", "calm", [
    "Fair enough. {gift} was never a down payment.",
])
add("follow", "plea", R, "core", "anxious", [
    "{bill} is my livelihood. Please look at it.",
    "I'm not asking for a favor. I'm asking you to read {bill}.",
])
add("follow", "press", R, "core", "braced", [
    "That's not an answer on {bill}.",
    "Is that a yes or a no on {bill}?",
    "People who gave to you are watching {bill}.",
])
add("follow", "threaten", R, "core", "braced", [
    "Then my next check goes to someone who'll back {bill}.",
], [FOR])
add("follow", "threaten", R, "core", "braced", [
    "Then my next check goes to someone who'll stop {bill}.",
], [AGAINST])
add("follow", "threaten", R, "core", "braced", [
    "{gift} was the last of it, then.",
])
add("follow", "confront", R, "core", "braced", [
    "You said the same about {bill} last time.",
], ["read-put-off-before"])
add("follow", "ask", R, "core", "calm", [
    "Where do you stand on {bill}, then?",
])
add("follow", "refuse", R, "core", "braced", [
    "I can't take a maybe on {bill} back to my people.",
])
add("follow", "bargain", R, "core", "guarded", [
    "Then meet me on part of {bill}.",
])

# A confrontation answered: the donor pushes back, or steps around it.
add("follow", "confront", R, "core", "braced", [
    "You took {gift} without asking what I'd want for it.",
    "Nobody said buy. I asked you about {bill}.",
])
add("follow", "deflect", R, "core", "guarded", [
    "This isn't about {gift}. It's about {bill}.",
    "Call it what you like. {bill} still matters to me.",
])
# After the donor steps around it: the player lets it rest, or presses.
add("reply", "accept", A, "core", "calm", [
    "Fair enough. Send me what you have on {bill}.",
    "All right. I'll read up on {bill}.",
])
add("reply", "press", A, "core", "braced", [
    "Then tell me plainly what you want on {bill}.",
    "Say it straight. What do you want me to do on {bill}?",
])
# The donor answers them: a promise to follow up, or the plain want.
add("follow", "promise", R, "core", "calm", [
    "I'll send it tonight. {bill} is worth your time.",
    "You'll have it by morning. Read the part about {about}.",
])
add("follow", "answer", R, "core", "calm", [
    "Plainly? I want you behind {bill}.",
], [FOR])
add("follow", "answer", R, "core", "calm", [
    "Plainly? I want you against {bill}.",
], [AGAINST])
add("follow", "answer", R, "core", "calm", [
    "A real look at {bill}. That's all I want.",
    "Your word on {bill} before it comes up. That's all.",
])
add("follow", "press", R, "core", "braced", [
    "You know what I want on {bill}. Now you know I mean it.",
    "I've said it twice now. {bill}, and where you'll be on it.",
], after="press")
# A promise to send it on: the player thanks them, or says where to send it.
add("reply", "thank", A, "core", "calm", [
    "Thank you. I'll read it before {bill} comes up.",
])
add("reply", "request", A, "core", "calm", [
    "Send it to my office, and copy my staff on {bill}.",
])
# After the donor says what they want: the player differs, or gives a date.
add("reply", "disagree", A, "core", "guarded", [
    "I don't see {bill} the way you do.",
    "I see {about} differently. I'll still hear you out.",
])
add("reply", "promise", A, "core", "calm", [
    "You'll have my answer on {bill} before it comes up.",
])
# The player asks back what it is to them; the donor says what the bill is about.
add("reply", "ask", A, "core", "calm", [
    "What is {bill} to you?",
    "Why does {bill} matter so much to you?",
])
add("follow", "answer", R, "core", "calm", [
    "I care about {about}. That's all it is.",
    "It's {about}. I've cared about that a long time.",
])

# ---- the close ----
add("close", "thank", R, "core", "calm", [
    "Thank you for hearing me on {bill}.",
])
add("close", "promise", R, "core", "calm", [
    "I'll hold you to that on {bill}.",
])
add("close", "accept", R, "core", "calm", [
    "Then I'll leave {bill} with you.",
])
add("close", "warn", R, "core", "braced", [
    "I'll remember this when {bill} comes up.",
    "Think about {bill}. I'll call again.",
])
add("close", "press", R, "core", "braced", [
    "Call me when you've decided on {bill}.",
])
add("close", "warn", R, "core", "braced", [
    "I'll remember where {gift} went.",
])

# The owner's liked lines, carried as openers (key and grade kept).
LIKED_AS = {
    "Then I'll find a candidate who listens.": [],
    "Fine. I'll send you a list tomorrow.": [],
    "Done. My people will call yours.": [],
}
LIKED_AFTER = {
    "Fine. I'll send you a list tomorrow.": "bargain",
    "Done. My people will call yours.": "bargain",
}
SIDED = {}


SLOTS = {
    "employer": "Where a person works, as people say it, from their job record's employer (said-as).",
    "work": "What a person does at work, with its article (\"a stocker\"), from their job record's title (said-as).",
    "gift": "What a donor just gave to the player's campaign, as people say it (\"about $500\"), from the campaigns engine's campaign-gift record.",
    "given": "What a donor has given the player's campaign in all, as people say it, from the campaign-gift record's running total.",
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
                use["key"] = "favor-asked"
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
            # The opening greets an offer, never the pressing after one.
            if step == "open":
                use["key"] = "favor-asked"
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
