"""The on-record move set's pieces, spliced into the scene-talk bank (words
composer, unit 4; docs/design/words-composer.md; data/english/scene-move-sets.json).

A member answering for a bill makes a move (state a stand, give the reason,
defer to what comes next, decline, turn it, attack the premise, leave) said
about the bill's records: {bill}, {about}, {floor-count}, {outlet}, {place},
and marks the facts module sets from the member's own records
(src/director/press-comment-facts.ts: stand-for/against, own-vote,
reason-views/town/deal/party/record, next-vote/desk/law/override/dead,
bill-passed/failed). Each piece is part of a joined sentence (`piece`):
every core carries an insert and is required, so no joined sentence can be
said without one.

The splice, in one pass:
  1. deletes every counted line (no insert, four words or more, not a piece)
     whose every use is a purpose the set serves;
  2. drops those purposes' uses from a counted line other purposes still use;
  3. carries each line the owner graded good into the set as an opener (its
     key and grade kept: never dropped);
  4. appends the pieces below, keyed `scene-talk.<step>-<move>.on-record-<n>`.

  python3 scripts/words/on-record-pieces.py           # splice
  python3 scripts/words/on-record-pieces.py --dry     # counts only
Run prettier on the bank after.
"""
import json
import re
import sys

BANK = "data/english/parts/scene-talk.json"
SETS = "data/english/scene-move-sets.json"
GRADES = "data/english/part-grades.json"
SET = "on-record"
AUTHOR = "Words builder (words composer unit 4, on-record move set)"
DATE = "2026-11-12"
INSERT = re.compile(r"\{[^{}\s]+\}")

# (step, move, role, part, text, requires, after, bearing)
# A core needs one stand fact when it states a side; reasons need the side
# and the reason fact; nothing else, so a move's wordings sit in one tier.
P = []


CONDITIONAL = ("floor-count",)


def add(step, move, role, part, bearing, rows, requires=(), after=None, group=None):
    for text in rows:
        P.append((step, move, role, part, text, list(requires), after, bearing, group))


A, R = "asked", "asker"

# ---- the member states their stand (reply: answer) ----
STANDS = {
    "for": [
        ("proud", [
            "I voted for {bill}, and I'd vote for it again.",
            "Put me down as a yes on {bill}. You can print that.",
            "I'm for {bill}, and I'll own it.",
        ]),
        ("calm", [
            "I'm for {bill}.",
            "My vote on {bill} was yes, and I meant it.",
            "I backed {bill}.",
        ]),
    ],
    "against": [
        ("braced", [
            "I voted against {bill}, and I'd do it again.",
            "I'm a no on {bill}. Print it.",
            "I couldn't vote for {bill}, not as it was written.",
        ]),
        ("calm", [
            "I said no to {bill}, and I'd say it again.",
            "My vote on {bill} was no, and I meant it.",
            "I'm against {bill}.",
        ]),
    ],
}
for side in ("for", "against"):
    for bearing, rows in STANDS[side]:
        add("reply", "answer", A, "core", bearing, rows, [f"stand-{side}"])
add("reply", "answer", A, "core", "calm", [
    "Here's what I think of {story}: I'll judge it by what it does in {place}.",
    "On {story}, I'll say it plainly: I want to see the numbers first.",
])
# Openers: short, by side, so no one wording leads every answer.
add("reply", "answer", A, "opener", "calm", [
    "Here's my answer.", "Plainly?", "I'll say it straight.", "Put this down.",
], ["own-vote"])
# A follow-up asks for the stand again under a cost: a yes-or-no question,
# answered first with the yes or the no (rule answer-is-the-kind-asked), so
# these cores lead with it and need no opener.
add("reply", "answer", A, "core", "proud", [
    "Even then. My yes on {bill} stands.",
    "Yes. I'd vote for {bill} again tomorrow.",
    "Every time. {bill} is worth what it costs me.",
    "It's still yes. I'd back {bill} again.",
], ["stand-for"], after="follow-ask")
add("reply", "answer", A, "core", "braced", [
    "Even then. My no on {bill} stands.",
    "Yes. I'd vote against {bill} again tomorrow.",
    "Every time. {bill} doesn't get my vote as it's written.",
    "Still no. {bill} hasn't changed, and neither have I.",
], ["stand-against"], after="follow-ask")
add("reply", "answer", A, "opener", "calm", [
    "Fine.", "Alright, here it is.", "Then here it is, plainly.",
], after="answer")
add("reply", "refuse", A, "opener", "guarded", [
    "Look.", "Not right now.", "Not out here.",
])
# The reason, given once: to the opening question, never again on a branch.
# Where the member's records hold a reason, the answer to the opening
# question is its own sentence with the reason required (a "why" is answered
# with the why); the stand cores are the same as the plain answer's.
OPENING = ["state-ask", "state-confront"]
WHY = "reply-answer-why"
add("reply", "answer", A, "core", "calm", [
    "I voted for {bill}, and here's why.",
    "I'm a yes on {bill}, and it's simple.",
    "My yes on {bill} comes down to one thing.",
    "I backed {bill} for a reason.",
    "Why I'm for {bill}? Easy.",
    "I'll tell you why I backed {bill}.",
], ["stand-for", "has-reason"], after=OPENING, group=WHY)
add("reply", "answer", A, "core", "calm", [
    "I voted against {bill}, and here's why.",
    "I'm a no on {bill}, and it's simple.",
    "My no on {bill} comes down to one thing.",
    "I opposed {bill} for a reason.",
    "Why I said no to {bill}? Easy.",
    "I'll tell you why I voted against {bill}.",
], ["stand-against", "has-reason"], after=OPENING, group=WHY)
add("reply", "answer", A, "reason", "calm", [
    "I've believed in {about} for a long time.",
    "I think {place} needs {about}.",
], ["stand-for", "reason-views"], after=OPENING, group=WHY)
add("reply", "answer", A, "reason", "calm", [
    "I've never been sold on {about}.",
    "I don't think {place} needs {about}.",
], ["stand-against", "reason-views"], after=OPENING, group=WHY)
add("reply", "answer", A, "reason", "tender", [
    "People in {place} asked me for it, and I listened.",
    "Most of the people who called my office about it wanted it.",
], ["stand-for", "reason-town"], after=OPENING, group=WHY)
add("reply", "answer", A, "reason", "tender", [
    "People in {place} told me they didn't want it.",
    "Most of the calls I got about it were against it.",
], ["stand-against", "reason-town"], after=OPENING, group=WHY)
add("reply", "answer", A, "reason", "calm", [
    "The section I asked for is in it now.",
    "It has the change I fought for, so it has my vote.",
], ["stand-for", "reason-deal"], after=OPENING, group=WHY)
add("reply", "answer", A, "reason", "calm", [
    "My caucus stood together on it, and so did I.",
    "My party lined up behind it, and I agree with them.",
], ["stand-for", "reason-party"], after=OPENING, group=WHY)
add("reply", "answer", A, "reason", "calm", [
    "My caucus stood together against it, and so did I.",
    "My party lined up against it, and I agree with them.",
], ["stand-against", "reason-party"], after=OPENING, group=WHY)
add("reply", "answer", A, "reason", "calm", [
    "I voted the same way the last time {about} came up.",
    "It's how I've voted on {about} before.",
], ["own-vote", "reason-record"], after=OPENING, group=WHY)

# ---- defer: what comes next (reply: stall) ----
add("reply", "stall", A, "core", "guarded", [
    "Ask me after {bill} comes to a vote.",
    "Give me until the vote on {bill}. Then you'll have it.",
    "I'll have something on {bill} the day it's voted on.",
], ["next-vote"])
add("reply", "stall", A, "core", "guarded", [
    "Ask me once {bill} is signed or vetoed.",
    "{bill} is on the desk now. Ask me when it's off.",
    "Wait for the signature on {bill}. Then ask me.",
], ["next-desk"])
add("reply", "stall", A, "core", "calm", [
    "Ask me once {bill} has been working a few months.",
    "Give {bill} a season. Then ask the people it was for.",
    "Let {bill} run a while. Then we'll talk.",
], ["next-law"])
add("reply", "stall", A, "core", "guarded", [
    "Ask me after the override vote on {bill}.",
    "There's an override vote on {bill} coming. After that.",
    "Wait for the override vote on {bill}. Then I'll talk.",
], ["next-override"])
add("reply", "stall", A, "core", "calm", [
    "{bill} is done. Ask me when someone brings back {about}.",
    "Ask me the next time someone brings back {about}. Someone will.",
    "{bill} lost. Talk to me when there's a new one.",
], ["next-dead"])
add("reply", "stall", A, "core", "guarded", [
    "Give me a week on {story}.",
    "I want to hear from people in {place} on {story} first.",
    "Ask me about {story} next week, when there's more to say.",
])

# ---- turn it to their cause (reply: deflect) ----
add("reply", "deflect", A, "core", "guarded", [
    "What matters about {bill} is {about}, not who voted which way.",
    "The question isn't my vote. It's whether {place} is better off with {about}.",
    "Write about what {bill} does for {place}, not about me.",
    "Look at what {bill} does before you look at me.",
])
add("reply", "deflect", A, "core", "calm", [
    "Read {bill} before you write about it.",
    "The text of {bill} is public. I'd start there.",
])

# ---- decline (reply: refuse) ----
add("reply", "refuse", A, "core", "guarded", [
    "I won't comment on {bill} today.",
    "My office will send {outlet} something in writing.",
    "I'm not answering questions about {bill} today.",
    "Not on {bill}, not today.",
])
add("reply", "refuse", A, "core", "braced", [
    "I've said what I'm going to say about {bill}.",
    "You won't get a quote on {bill} out of me.",
])
add("reply", "refuse", A, "reason", "guarded", [
    "It's still on the floor's calendar.",
    "There's a vote coming first.",
], ["next-vote"])
add("reply", "refuse", A, "reason", "guarded", [
    "It's on the desk now, and that's where the answer is.",
], ["next-desk"])
add("reply", "refuse", A, "reason", "guarded", [
    "There's an override vote coming.",
], ["next-override"])

# ---- attack the premise (reply: confront) ----
add("reply", "confront", A, "core", "braced", [
    "You've got {bill} wrong, and you know it.",
    "You'd write it the same way whatever I said about {bill}.",
    "Why does {outlet} only ask me about {bill}?",
    "{outlet} made up its mind about {bill} before you got here.",
])
add("reply", "confront", A, "core", "braced", [
    "The count was {floor-count}. Read the roll before you write about it.",
    "It was {floor-count}. Ask the other side why, not just me.",
], ["own-vote"])

# ---- leave ----
add("reply", "leave", A, "core", "guarded", [
    "That's all you get on {bill} today.",
    "I've got a meeting. Call my office about {bill}.",
    "We're done with {bill} for today.",
    "{outlet} has my answer. Excuse me.",
    "I'm late. Walk with me if it's about {bill}.",
    "I've said all I'm saying about {story}. Excuse me.",
])

# ---- boast ----
add("reply", "boast", A, "core", "proud", [
    "Check back on {bill} in a year. You'll see I was right.",
    "Write that {bill} works. Then come back and check.",
    "Mark the day you asked me about {bill}. I'll be proven right.",
])
add("reply", "boast", A, "core", "proud", [
    "I voted the same way on {about} last time, and I was right then too.",
], ["reason-record"])
add("reply", "boast", A, "core", "proud", [
    "It went down {floor-count}, and I was on the right side of it.",
], ["bill-failed", "stand-against"])
add("reply", "boast", A, "core", "proud", [
    "It passed {floor-count}. I counted those votes myself.",
    "{floor-count}, and I was on the right side of it.",
], ["bill-passed", "stand-for"])

# ---- the lie: a claim the record contradicts ----
add("reply", "lie", A, "core", "calm", [
    "I've been for {about} from the start.",
    "I never had a problem with {bill}.",
    "Nobody fought harder for {bill} than I did.",
], ["stand-against"])
add("reply", "lie", A, "core", "calm", [
    "I had doubts about {bill} all along.",
    "I was never really for {about}.",
    "I only voted for {bill} because the rest did.",
], ["stand-for"])
add("reply", "lie", A, "core", "calm", [
    "Nobody in {place} has called me upset about {bill}.",
    "Every member I talked to was fine with {bill}.",
    "Not one person in {place} has complained about {story}.",
])

# ---- confess, once caught ----
add("reply", "confess", A, "core", "contrite", [
    "Alright. I said more about {bill} than I should have.",
    "Fine. Not everyone in {place} is happy with {bill}.",
    "Fair. I got ahead of myself on {bill}.",
    "Okay. Some of {bill} is still being fought over.",
    "Alright. I didn't tell you the whole of it on {story}.",
])

# ---- the reporter: accept what was given ----
add("follow", "accept", R, "core", "calm", [
    "Then I'll write that you declined to talk about {bill}.",
    "{outlet} will say you had no comment on {bill}.",
    "I'll leave room in the story on {bill} in case you call.",
    "Then the story on {story} says you wouldn't talk.",
], after="refuse")
add("follow", "accept", R, "core", "calm", [
    "Then I'll write that you're waiting on what happens to {bill}.",
    "I'll ask about {bill} again, then. It's on my calendar.",
    "Fine. I'll print that you're not ready to talk about {story}.",
], after="stall")
add("follow", "accept", R, "core", "calm", [
    "Then I'll quote {bill} and let readers judge.",
    "I'll write what {bill} does, and that you pointed me to it.",
    "Fine. The story on {story} runs with what's on the record.",
], after="deflect")
add("follow", "accept", R, "core", "calm", [
    "I'll check {bill} against what you said.",
    "Bold. That goes in the story on {bill} word for word.",
], after="boast")
add("follow", "accept", R, "core", "calm", [
    "Then I'll print what you said about {bill}, as you said it.",
    "Noted. That's going in about {story}, on the record.",
], after="lie")
add("follow", "accept", R, "core", "calm", [
    "Thank you. I'll print the corrected version on {bill}.",
    "That's the honest version of {story}, and it's going in.",
], after="confess")
add("follow", "accept", R, "core", "calm", [
    "Okay. That's what goes in about {bill}.",
    "I can work with that on {story}.",
], after="answer")

# ---- the reporter thanks for the answer, naming it ----
add("follow", "thank", R, "opener", "calm", [
    "Many thanks.",
    "Thanks.",
    "Appreciate it.",
], after="answer")
add("follow", "thank", R, "core", "calm", [
    "I'll put in that you're for {bill}.",
    "That's clear enough on {bill}.",
    "Your yes on {bill} goes in as you said it.",
], ["stand-for"], after="answer")
add("follow", "thank", R, "core", "calm", [
    "I'll put in that you're against {bill}.",
    "I have your no on {bill}.",
    "Your no on {bill} goes in as you said it.",
], ["stand-against"], after="answer")
add("follow", "thank", R, "core", "calm", [
    "That's what I needed on {story} for {outlet}.",
    "You stopped to talk about {story}. Not everyone does.",
], after="answer")
add("follow", "thank", R, "core", "calm", [
    "Then I'll put what you said about {bill} in the story.",
    "Okay. What you said on {story} is on the record.",
], after="lie")

# ---- the reporter presses ----
add("follow", "press", R, "core", "braced", [
    "Everyone in {place} can read how you voted on {bill}. They can't read why.",
    "Not answering about {bill} is an answer too.",
    "People in {place} will ask me about {bill}. What do I tell them?",
    "A statement about {bill} doesn't answer questions. You do.",
])
add("follow", "press", R, "core", "braced", [
    "It was {floor-count}. The people on the losing side want to know why.",
    "The roll on {bill} was {floor-count}. You were part of that.",
], ["own-vote"])

# ---- the reporter asks the next question ----
# Each asks for the member's stand again under a cost (a yes or a no and
# the stand), which the stand on record answers; nothing asks for a fact
# the member's records do not hold.
add("follow", "ask", R, "core", "curious", [
    "Even if {bill} costs you votes?",
    "Even if the people who didn't want {bill} hold it against you?",
    "Would you vote for {bill} again tomorrow?",
], ["stand-for"], after="answer")
add("follow", "ask", R, "core", "curious", [
    "Even if the people who wanted {bill} hold it against you?",
    "Would you vote against {bill} again tomorrow?",
    "Even if {bill} comes back next year?",
], ["stand-against"], after="answer")
add("follow", "ask", R, "core", "curious", [
    "So you overstated it. What's the true version of {bill}?",
    "What's true about {bill}, then?",
], after="confess")

# ---- the reporter answers a challenge ----
add("follow", "answer", R, "core", "calm", [
    "I'm not taking sides on {bill}. I'm asking because people will ask me.",
    "Everything I have on {bill} is on the record. I'd rather print your answer than guess.",
    "Nothing about {story} is written yet. You can change it.",
    "I'm asking every member about {bill}, not just you.",
], after="confront")

# ---- the reporter catches the lie, from the record ----
add("follow", "confront", R, "core", "braced", [
    "The roll on {bill} doesn't say that.",
    "That isn't what the record on {bill} shows.",
], ["own-vote"])

# ---- closes: what will be printed ----
add("close", "thank", R, "core", "calm", [
    "Thanks. The story on {bill} runs in {outlet} tomorrow.",
    "Appreciate it. {outlet} runs it in the morning.",
    "Thanks. Your answer on {story} goes in tomorrow's story.",
])
add("close", "promise", R, "core", "calm", [
    "I'll read you your quotes on {bill} before it runs.",
    "I'll send you what I write about {bill}.",
    "I'll check what you said about {story}, and then I'll print it.",
])
add("close", "accept", R, "core", "calm", [
    "Then the story on {bill} runs without your side.",
    "Then {outlet} runs it without you.",
])
add("close", "warn", R, "core", "guarded", [
    "The story on {bill} runs either way.",
    "I'll be at the next meeting asking about {bill}.",
    "{outlet} runs it tomorrow, with or without you.",
    "The questions about {story} don't go away because you walked past them.",
])
add("close", "warn", R, "core", "guarded", [
    "I'll write that you walked off when I asked about {bill}.",
    "Walk away if you want. {bill} walks with you.",
], after="leave")
add("close", "press", R, "core", "calm", [
    "My number's on the card if you want to add anything about {bill}.",
    "Call {outlet} if you change your mind about {bill}.",
    "You know where to find me when you're ready to talk about {story}.",
])

# ---- the opening and the beats ----
add("open", "greet", R, "core", "calm", [
    "It's about {bill}.",
    "This is about {story}.",
    "{outlet} is running something on {bill}.",
])
add("beat", "beat", "narrator", "core", "calm", [
    "A second reporter drifts over to hear what {name} gets.",
    "Somewhere behind {name}, a camera clicks twice.",
    "{name} writes fast, then looks up.",
    "A staffer hovers at your elbow while {name} writes.",
])


# The owner's liked lines, carried as openers (key and grade kept).
LIKED_AS = {
    "Do you have a moment for a couple of questions?": [],
    "Mind if I ask you a few things?": [],
    "I'm voting for it, and you can quote me.": ["stand-for", "next-vote"],
    "I'll have something to say after the vote.": ["next-vote"],
    "Even then. It's the right call.": ["stand-for"],
    "Read the bill before you judge it.": ["stand-for"],
    "I'd tell them I listened, and I still disagree.": ["stand-against"],
    "Then let me answer it on the record.": [],
    "We have it on the record. I'm just giving you a chance to respond.": [],
    "That's all I needed. Thanks.": [],
    "People say a lot of things.": [],
    "I'm not doing this in a hallway.": [],
    "Your vote is public. Your reasons don't have to be a secret.": ["own-vote"],
}


# Carried liked openers that themselves say the member's side: the core's
# yes or no is not said again after one (a turn says its stand once).
STATES_STAND = {
    "I'd tell them I listened, and I still disagree.",
    "Even then. It's the right call.",
    "I'm voting for it, and you can quote me.",
}


# What a carried liked opener answers, where it answers a follow-up.
LIKED_AFTER = {
    "Even then. It's the right call.": "follow-ask",
    "Read the bill before you judge it.": "follow-ask",
    # Only to the question it answers: whether they'd hold it against you.
    "I'd tell them I listened, and I still disagree.": "@Even if the people who wanted {bill} hold it against you?",
    "Then let me answer it on the record.": "answer",
    "We have it on the record. I'm just giving you a chance to respond.": "confront",
    "People say a lot of things.": "confront",
    "Your vote is public. Your reasons don't have to be a secret.": "refuse",
}

# Whole lines with an insert that stay, but state a side: said only for it.
SIDED = {"I support it. It's good for {place}.": ["stand-for"]}


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
    serves = set(json.load(open(SETS))["sets"][SET]["purposes"])
    grades = json.load(open(GRADES))["parts"]
    fam = lambda u: (u.get("purpose") or "").split(".")[0] in serves
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
            if x["text"] in STATES_STAND:
                x["piece"]["stand"] = True
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
            if LIKED_AS[x["text"]]:
                use["requiresFacts"] = LIKED_AS[x["text"]]
            if x["text"] in LIKED_AFTER:
                use["after"] = LIKED_AFTER[x["text"]]
            x["uses"] = [use] + [v for v in x["uses"] if not fam(v)]
            x["piece"] = {"of": f"{SET}.{u['step']}-{u['move']}", "part": "opener"}
            if x["text"] in STATES_STAND:
                x["piece"]["stand"] = True
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
            if one:
                use["after"] = one
            # A piece that says a conditional record's fact needs that fact:
            # the floor count is there only where the roll was taken, and a
            # piece more specific than its fellows must not win the pick and
            # then fail to be worded (arc-variant: press-comment.hostile).
            need = list(requires) + [
                slot for slot in CONDITIONAL if "{" + slot + "}" in text and slot not in requires
            ]
            if need:
                use["requiresFacts"] = need
            uses.append(use)
        piece = {"of": f"{SET}.{group or f'{step}-{move}'}", "part": part}
        if part == "core" or (group == WHY and part == "reason"):
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
    bank["slots"].setdefault(
        "about",
        "What a bill is about, as a noun phrase (\"a higher minimum wage\"), from the question its first section answers in the legislature record.",
    )
    bank["slots"].setdefault(
        "floor-count",
        "A bill's floor count, yes to no (\"5 to 2\"), from the legislature's roll call on it.",
    )
    bank["parts"] = kept
    with open(BANK, "w") as out:
        json.dump(bank, out, indent=2, ensure_ascii=False)
        out.write("\n")


main()
