"""The bribe move set's pieces, spliced into the scene-talk bank (words
composer, unit 6; docs/design/words-composer.md; data/english/scene-move-sets.json).

A bribe offered to the player's seat and the pressing after a refusal
(corruption.ts: corruption.bribe-offered, corruption.bribe-pressed) are said
about the offer's records (src/director/bribe-facts.ts): {amount}, the bill
({bill}, {about}) or the contract ({contract}), and where the offerer is a
lobbyist who met the member on the bill, {group}, {vote-wanted} and {cost}.
The scene's ending is read by corruption.ts (took-it moves the money; a
refusal settles it; said-you-would-report reaches the press). The variants
(small, large, friend, desperate, again; pressed: again, begging, open,
veiled) are chosen from the records; their reads mark openers here.

  python3 scripts/words/bribe-pieces.py           # splice
  python3 scripts/words/bribe-pieces.py --dry     # counts only
Run prettier on the bank after.
"""
import json
import re
import sys

BANK = "data/english/parts/scene-talk.json"
SETS = "data/english/scene-move-sets.json"
GRADES = "data/english/part-grades.json"
SET = "bribe"
# The purposes whose counted lines this set replaces.
REPLACES = {
    "bribe-offer", "bribe-offer.small", "bribe-offer.large", "bribe-offer.friend",
    "bribe-offer.desperate", "bribe-offer.again",
    "bribe-pressed", "bribe-pressed.again", "bribe-pressed.begging",
    "bribe-pressed.open", "bribe-pressed.veiled",
}
AUTHOR = "Words builder (words composer unit 6, bribe move set)"
DATE = "2026-11-12"
INSERT = re.compile(r"\{[^{}\s]+\}")

P = []


def add(step, move, role, part, bearing, rows, requires=(), after=None, group=None):
    # A vote's pieces say the bill: they need its name on the record too.
    if "favor-vote" in requires:
        requires = list(requires) + ["bill"]
    if "favor-contract" in requires and "contract" not in requires:
        requires = list(requires) + ["contract"]
    # A vote or a contract with no name on the record: the price alone.
    requires = [
        r.replace("-unnamed", "") if r.endswith("-unnamed") else r for r in requires
    ]
    for text in rows:
        # A rounded figure ("about $4,400") is never read back in a question
        # as if exact: a question names {amount-exact} or says it another way.
        for q in re.findall(r"[^.?!]*\?", text):
            assert not re.search(r"\{(?:amount|cost)\}", q), text
        P.append((step, move, role, part, text, list(requires), after, bearing, group))


A, R = "asked", "asker"
WHY = None
VOTE, DEAL = "favor-vote", "favor-contract"

# ---- the offer (state: request), said about what it buys ----
add("state", "request", R, "core", "guarded", [
    "{group} can put {amount} your way. All it takes is a vote {vote-wanted} {bill}.",
    "Vote {vote-wanted} {bill}, and {amount} is yours. Nobody at {group} says a word.",
    "There's {amount} from {group} if you vote {vote-wanted} {bill}.",
], ["amount", "group", "vote-wanted", VOTE])
add("state", "request", R, "core", "guarded", [
    "Your vote on {bill} is worth {amount} to me.",
    "There's {amount} in this for you if {bill} goes my way.",
    "{amount}, cash, for the right vote on {bill}.",
], ["amount", VOTE])
add("state", "request", R, "core", "guarded", [
    "{amount} is yours if {contract} goes to the right people.",
    "Steer {contract} our way, and there's {amount} in it for you.",
    "There's {amount} for you when {contract} is awarded to us.",
], ["amount", "contract", DEAL])
# A bill with no name on the record: the price, and the vote.
add("state", "request", R, "core", "guarded", [
    "There's {amount} in this for you if your vote goes my way.",
    "{amount}, for one vote. That's the whole offer.",
], ["amount", "favor-vote-unnamed"])
add("state", "request", R, "core", "guarded", [
    "There's {amount} in this for you if the contract comes our way.",
    "{amount}, if the bid goes to us. That's the whole offer.",
], ["amount", "favor-contract-unnamed"])
add("state", "offer", R, "core", "guarded", [
    "It's only {amount}. A small thanks, for when the bids are read.",
], ["amount", "favor-contract-unnamed"])
add("state", "press", R, "core", "braced", [
    "{amount} is still on the table for the contract.",
], ["amount", "favor-contract-unnamed"])
add("state", "plea", R, "core", "anxious", [
    "Please. I need that contract. {amount} is all I have.",
], ["amount", "favor-contract-unnamed"])
add("reply", "accept", A, "core", "guarded", [
    "Fine. For {amount}, it goes your way.",
], ["amount"])
add("reply", "stall", A, "core", "guarded", [
    "Let me think about it before I think about {amount}.",
], ["amount"])
# What it costs the people the group speaks for: the reason, from the meeting.
add("state", "request", R, "reason", "guarded", [
    "It costs the people I speak for {cost} a year.",
    "That's {cost} a year out of our members' pockets.",
], ["cost", "group"])
# Openers from the records the variant read.
add("state", "request", R, "opener", "guarded", [
    "We go back a ways, so I'll say it plainly.",
    "I wouldn't ask just anyone this.",
], ["read-tie"])
add("state", "request", R, "opener", "guarded", [
    "I know you said no last time.",
    "I'm asking again, and I know how the last time went.",
], ["read-refused-before"])
add("state", "request", R, "opener", "anxious", [
    "I'll be honest, I need this one.",
    "I'm not in a spot to take no for an answer.",
], ["read-strain"])
add("state", "request", R, "opener", "guarded", [
    "Word is you've done this before.",
    "I hear you're someone who listens to reason.",
], ["heard-of"])

# ---- the variants' own openings: a gift (offer), a second ask (press), a plea ----
add("state", "offer", R, "core", "guarded", [
    "It's only {amount}. Call it thanks for looking at {bill} again.",
    "{amount} is nothing. Just keep {bill} in mind.",
], ["amount", VOTE])
add("state", "offer", R, "core", "guarded", [
    "It's only {amount}. Keep {contract} in mind.",
], ["amount", "contract", DEAL])
add("state", "offer", R, "core", "guarded", [
    "It's only {amount}. A small thanks for your vote.",
], ["amount", "favor-vote-unnamed"])
add("state", "press", R, "core", "braced", [
    "I'm back about {bill}, and {amount} is still on the table.",
    "Same offer on {bill}. {amount}.",
], ["amount", VOTE])
add("state", "press", R, "core", "braced", [
    "{contract} again, and {amount} is still on the table.",
], ["amount", "contract", DEAL])
add("state", "press", R, "core", "braced", [
    "{amount} is still on the table for your vote.",
], ["amount", "favor-vote-unnamed"])
add("state", "plea", R, "core", "anxious", [
    "Please. {bill} would ruin me. {amount} is everything I can put together.",
    "I need {bill} to go my way. Here's {amount}. It's all I have.",
], ["amount", VOTE])
add("state", "plea", R, "core", "anxious", [
    "I need {contract}, or I lose the business. {amount} is all I can offer.",
], ["amount", "contract", DEAL])
add("state", "plea", R, "core", "anxious", [
    "Please. {amount} is all I have, for one vote.",
], ["amount", "favor-vote-unnamed"])
add("reply", "comfort", A, "core", "tender", [
    "I can hear what {bill} costs you. I still can't take money for my vote.",
    "I'm sorry it's come to this. Keep the money, and tell me about {bill} instead.",
], [VOTE])
add("reply", "comfort", A, "core", "tender", [
    "You need {amount} more than I do. Put it away.",
], ["amount"])
add("reply", "apologize", A, "core", "contrite", [
    "I'm sorry. I can't, not on {bill}.",
    "I'm sorry. Not for {amount}, and not from a friend.",
], [VOTE])
add("reply", "tell", A, "core", "braced", [
    "I'll say it plainly. My vote on {bill} isn't changing.",
    "Plainly, then. I turned down {amount}, and I'd do it again.",
], ["amount", VOTE])
add("follow", "bargain", R, "core", "guarded", [
    "Then name your number. {amount} was only the start.",
    "If {amount} isn't enough, tell me what is.",
], ["amount"])
add("follow", "offer", R, "core", "guarded", [
    "Then take {amount} as a gift, nothing more.",
], ["amount"])
add("follow", "warn", R, "core", "braced", [
    "People notice who stands where on {bill}.",
    "Someone always remembers a no on {bill}.",
], [VOTE])
add("follow", "thank", R, "core", "anxious", [
    "Thank you for hearing me out about {bill}.",
], [VOTE], after="comfort")

# ---- the opening: what it is about (open: greet) ----
add("open", "greet", R, "core", "guarded", [
    "I'm here about {bill}.",
    "This is about your vote on {bill}.",
], [VOTE])
add("open", "greet", R, "core", "guarded", [
    "I'm here about {contract}.",
    "This is about who gets {contract}.",
], ["contract", DEAL])

# ---- the pressing after a refusal (state: threaten) ----
add("state", "threaten", R, "core", "braced", [
    "You turned down {amount}. Think about who remembers that when {bill} comes up.",
    "{amount} was on the table for {bill}, and you waved it off. That gets around.",
    "You said no to {amount} on {bill}. I'd think hard before saying it twice.",
], ["amount", VOTE])
add("state", "threaten", R, "core", "braced", [
    "{group} doesn't forget a no on {bill}.",
    "{group} has long memories, and {bill} isn't the last vote you'll take.",
    "You crossed {group} on {bill}. That costs something.",
], ["group", VOTE])
add("state", "threaten", R, "core", "braced", [
    "You turned down {amount} on {contract}. People heard about it.",
    "{amount} for {contract}, and you said no. That gets remembered.",
], ["amount", "contract", DEAL])
add("state", "threaten", R, "opener", "anxious", [
    "I'm asking you one more time.",
    "Please. Hear me out once more.",
], ["read-strain"])

# ---- the official's answers ----
add("reply", "accept", A, "core", "guarded", [
    "Fine. For {amount}, you have my vote on {bill}.",
    "Leave it. {bill} gets the vote you want.",
    "Done. {amount}, and we never talked.",
], ["amount", VOTE])
add("reply", "accept", A, "core", "guarded", [
    "Fine. For {amount}, {contract} goes your way.",
    "Leave it. {contract} is yours.",
], ["amount", "contract", DEAL])
add("reply", "refuse", A, "core", "braced", [
    "My vote on {bill} was never yours to buy.",
    "My vote on {bill} isn't for sale.",
    "Put the money away. {bill} gets my vote on what it does.",
], [VOTE])
add("reply", "refuse", A, "core", "braced", [
    "{contract} goes to whoever bids best. Not to whoever pays me.",
    "Not for {amount}. {contract} isn't mine to sell.",
], [DEAL])
add("reply", "refuse", A, "core", "braced", [
    "Not for {amount}. Not for anything.",
    "I don't sell my office, not for {amount}.",
], ["amount"])
add("reply", "leave", A, "core", "braced", [
    "We're done. I don't take money for my office, not {amount}, not anything.",
    "I'm leaving, and the answer on {amount} is still no.",
], ["amount"])
add("reply", "confront", A, "core", "braced", [
    "That's {amount} offered for a vote. I'm reporting it.",
    "You just offered me {amount} to change a vote. That goes on the record today.",
], ["amount"])
add("reply", "confront", A, "core", "braced", [
    "{group} sent you here with cash? I'm reporting it.",
    "Does {group} know you're offering money for votes? It will once I report it.",
], ["group"])
add("reply", "stall", A, "core", "guarded", [
    "Let me think about {bill} before I think about your money.",
    "Ask me again closer to the vote on {bill}.",
    "I'm not answering that today. Not about {bill}.",
], [VOTE])
add("reply", "stall", A, "core", "guarded", [
    "Let me think about {contract} before I think about your money.",
    "Ask me again when the bids on {contract} are in.",
], [DEAL])
add("reply", "lie", A, "core", "guarded", [
    "Sure. Leave it with me, and I'll see about {bill}.",
    "Consider it handled. {bill} won't be a problem.",
], [VOTE])
add("reply", "deflect", A, "core", "guarded", [
    "Talk to me about what {bill} does, not about money.",
    "If you want my vote on {bill}, make the case for it.",
], [VOTE])
add("reply", "leave", A, "core", "braced", [
    "We're done talking about {bill}.",
    "I'm leaving. Take your offer on {bill} to someone else.",
], [VOTE])

# ---- the offerer answers ----
add("follow", "thank", R, "core", "guarded", [
    "Smart. {group} won't forget it.",
    "Good. {group} remembers its friends.",
], ["group"], after="accept")
add("follow", "thank", R, "core", "guarded", [
    "Good. The money's yours. Just remember {bill}.",
    "Pleasure. I'll be watching the roll on {bill}.",
], [VOTE], after="accept")
add("follow", "plea", R, "core", "anxious", [
    "{bill} costs the people I speak for {cost} a year. Think about that.",
    "It's {cost} a year to us. You'd do the same in my spot.",
], ["cost", VOTE])
add("follow", "plea", R, "core", "anxious", [
    "Nobody would know. It's {amount} and one vote on {bill}.",
    "One vote on {bill}. That's all I'm asking, and it's {amount}.",
], ["amount", VOTE])
add("follow", "press", R, "core", "braced", [
    "Everyone has a price. I brought {amount}. What's yours?",
    "If {amount} is too small, name a number.",
], ["amount"])
# Asked back as a figure only where the record's own figure is the one said.
add("follow", "press", R, "core", "braced", [
    "Everyone has a price. Is yours more than {amount-exact}?",
], ["amount-exact"])
add("follow", "accept", R, "core", "guarded", [
    "Fine. Keep your vote. {group} will find another.",
    "Suit yourself. {group} has other members to talk to.",
], ["group"])
add("follow", "accept", R, "core", "guarded", [
    "Fine. {bill} goes how it goes, then.",
    "Your call. We'll see how {bill} does without you.",
], [VOTE])
add("follow", "threaten", R, "core", "braced", [
    "Say a word about this, and {group} puts its money into your next race instead.",
    "Tell anyone, and {group} remembers it every time you need a vote.",
], ["group"])
add("follow", "threaten", R, "core", "braced", [
    "Tell anyone, and it's my word against yours on {bill}.",
    "Go ahead and report it. Then explain why you met me about {bill}.",
], [VOTE])
add("follow", "deflect", R, "core", "guarded", [
    "It's a contribution. People make them about bills like {bill} all the time.",
    "Call it support. Everyone who cares about {bill} gives something.",
], [VOTE])

# ---- the close ----
add("close", "warn", R, "core", "braced", [
    "You'll want friends when {bill} comes back.",
    "Remember this the next time {bill} needs votes.",
], [VOTE])
add("close", "warn", R, "core", "braced", [
    "{group} will be at your next election.",
], ["group"])
add("close", "accept", R, "core", "guarded", [
    "Then we never talked about {bill}.",
    "Forget I came about {bill}.",
], [VOTE])
add("close", "thank", R, "core", "guarded", [
    "Pleasure doing business on {bill}.",
], [VOTE])

# The owner's liked lines, carried as openers (key and grade kept).
LIKED_AS = {
    "I'll keep this short.": [],
    "Can we close the door?": [],
    "I wanted to thank you in person.": [],
    "Not for any price.": [],
    "A thank-you doesn't weigh that much. Take it back.": [],
    "A thank-you is a card. This is not a card.": [],
}
# A thank-you is refused only where the offer called itself one: the offer
# pieces whose own words frame the money as thanks.
THANKS = [
    "@It's only {amount}. A small thanks, for when the bids are read.",
    "@It's only {amount}. Call it thanks for looking at {bill} again.",
    "@It's only {amount}. A small thanks for your vote.",
    "scene-talk.state-request.bill-is-coming-to-you-i-d-like-to-know-you-ll-be-with-me-and-this-is-h",
]
LIKED_AFTER = {
    "A thank-you doesn't weigh that much. Take it back.": THANKS,
    "A thank-you is a card. This is not a card.": THANKS,
}
SIDED = {}


SLOTS = {
    "amount": "The money offered in a bribe, as people say it (\"about $400\"), from the corruption engine's crime record.",
    "amount-exact": "The money offered in a bribe, said without \"about\" only where the crime record's own figure is the one said (\"$400\").",
    "group": "The interest group a lobbyist offering a bribe speaks for, from the interest-groups engine's lobbying record.",
    "vote-wanted": "The side the offerer wants the vote on, \"for\" or \"against\", from the group's side in its lobbying record.",
    "cost": "What a bill costs the employers a group speaks for a year (\"about $40,000\"), from the lobbying record.",
    "contract": "A public contract by the budget line it pays from (\"the road contract\"), from the bribe's subject.",
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
        LIKED_AFTER[text] = [
            keys[one[1:]] if one.startswith("@") else one
            for one in (after if isinstance(after, list) else [after])
        ]
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
            mine_ = [u for u in x["uses"] if u.get("set") == SET]
            others = [u for u in x["uses"] if u.get("set") != SET]
            base = {k: v for k, v in mine_[0].items() if k not in ("requiresFacts", "after")}
            if LIKED_AS[x["text"]]:
                base["requiresFacts"] = LIKED_AS[x["text"]]
            x["uses"] = [
                {**base, **({"after": one} if one else {})}
                for one in LIKED_AFTER.get(x["text"], [None])
            ] + others
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
            x["uses"] = [
                {**use, **({"after": one} if one else {})}
                for one in LIKED_AFTER.get(x["text"], [None])
            ] + [v for v in x["uses"] if not fam(v)]
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
