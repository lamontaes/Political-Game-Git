"""The case-help move set's pieces, spliced into the scene-talk bank (words
composer, unit 5; docs/design/words-composer.md; data/english/scene-move-sets.json).

Office hours: a constituent brings the problem their own records hold (the
constituent-cases engine's case: out of work with savings running down, or
paid under the minimum wage in force) and the official answers with what the
office can really do (constituent-cases.ts resolve): take it up, which refers
it to the workforce office or the labor standards office; hand it to an aide
on their staff; or turn it away. Every core carries an insert from the case's
records (src/director/constituent-help-facts.ts caseFacts: {agency},
{employer}, {since}, {money-left}, {pay}, {floor}, {other-cases}, {staffer},
{respond-in}).

The splice deletes every counted line of the base purpose and of the
lost-job and short-pay variants (their problems are the engine's two); the
eviction and sick variants keep their lines, since no case of the engine is
an eviction or a sickness (SG-STORY-constituent-help-rent-and-care-have-no-case):
they are the scene inventory's to judge.

  python3 scripts/words/case-help-pieces.py           # splice
  python3 scripts/words/case-help-pieces.py --dry     # counts only
Run prettier on the bank after.
"""
import json
import re
import sys

BANK = "data/english/parts/scene-talk.json"
SETS = "data/english/scene-move-sets.json"
GRADES = "data/english/part-grades.json"
SET = "case-help"
# The purposes whose counted lines this set replaces.
REPLACES = {"constituent-help", "constituent-help.lost-job", "constituent-help.short-pay"}
AUTHOR = "Words builder (words composer unit 5, case-help move set)"
DATE = "2026-11-12"
INSERT = re.compile(r"\{[^{}\s]+\}")

P = []


def add(step, move, role, part, bearing, rows, requires=(), after=None, group=None):
    for text in rows:
        P.append((step, move, role, part, text, list(requires), after, bearing, group))


A, R = "asked", "asker"
WHY = None
WORK, WAGE = "problem-work", "problem-wage"

# ---- the constituent brings the problem their records hold (state: request) ----
add("state", "request", R, "core", "anxious", [
    "I've been out of work a while, and my savings are {money-left}.",
    "I need a job. What I saved is {money-left}.",
    "Nobody's hiring me, and my savings are {money-left}.",
], [WORK, "money-left"])
add("state", "request", R, "core", "anxious", [
    "{employer} let me go {since} ago, and my savings are {money-left}.",
    "I worked at {employer} until {since} ago. Nobody's called back, and my savings are {money-left}.",
    "Since {employer} laid me off {since} ago, I've lived on savings. They're {money-left}.",
], [WORK, "money-left", "employer", "since"])
add("state", "request", R, "core", "anxious", [
    "My job pays {pay} an hour, and the minimum wage is {floor}.",
    "I'm paid {pay} an hour. The floor is {floor}, and my boss knows it.",
    "The law says {floor} an hour. My check says {pay}.",
], [WAGE, "pay", "floor"])

# ---- take it up: the office refers the case (reply: promise; ending will-call) ----
add("reply", "promise", A, "core", "calm", [
    "I'll send your case to {agency} today.",
    "I'll call {agency} about it before the day is out.",
    "This goes from my office to {agency} today, with my name on it.",
], ["agency"])

# ---- an aide takes it (reply: offer; ending caseworker) ----
add("reply", "offer", A, "core", "calm", [
    "{staffer} on my staff will take your case to {agency}.",
    "Sit down with {staffer}. My office files it with {agency}.",
    "{staffer} handles cases like yours. It goes to {agency} from here.",
], ["staffer", "agency"])
add("reply", "offer", A, "core", "calm", [
    "Leave your details at the desk. My office files it with {agency}.",
    "Give the desk your number, and my office will take it to {agency}.",
    "Write it all down for the desk. It goes to {agency} from my office.",
], ["agency"])

# ---- turn it away, with the reason the office's books hold (reply: decline) ----
add("reply", "decline", A, "core", "guarded", [
    "My office has {other-cases} open, and I can't take yours on.",
    "I've got {other-cases} ahead of yours. I can't take it.",
    "Not this one. I've got {other-cases} on my desk already.",
], ["other-cases"])
add("reply", "decline", A, "core", "guarded", [
    "You'll have to go to {agency} yourself. My office can't carry it.",
    "{agency} takes these directly. I'm not taking it on.",
    "I can't take this one. {agency} is where it goes.",
], ["agency"])

# ---- ask what the records answer (reply: ask; the constituent answers) ----
add("reply", "ask", A, "core", "calm", [
    "How long since {employer} let you go?",
    "When did {employer} let you go?",
    "How long were you out before you came here, after {employer}?",
], [WORK, "employer", "since"])
add("reply", "ask", A, "core", "calm", [
    "Does every check say {pay} an hour?",
    "Is {pay} what they've paid you all along?",
    "Has it been {pay} on every check?",
], [WAGE, "pay", "floor"])
add("follow", "answer", R, "core", "anxious", [
    "{since}. And my savings are {money-left}.",
    "{since} now, and nobody's called back.",
    "It's been {since}, and what I saved is {money-left}.",
], [WORK, "employer", "since", "money-left"], after="ask")
add("follow", "answer", R, "core", "anxious", [
    "Yes. {pay} an hour, every check, when the law says {floor}.",
    "Every check. {pay}, never {floor}.",
    "Yes, all along. {pay} an hour against a floor of {floor}.",
], [WAGE, "pay", "floor"], after="ask")

# ---- the lie: a call never made (reply: lie) ----
add("reply", "lie", A, "core", "calm", [
    "I already called {agency} about your case.",
    "{agency} has your case already. I sent it.",
    "I talked to {agency} about this last week.",
], ["agency"])

# ---- sorry, and make it right (reply: apologize, after a press) ----
add("reply", "apologize", A, "core", "contrite", [
    "You're right. I'll call {agency} while you're sitting here.",
    "That's fair. I'll put it to {agency} myself, today.",
    "I'm sorry. {agency} gets your case from me before you leave.",
], ["agency"])

# ---- leave: the office decides by its own deadline (reply: leave) ----
add("reply", "leave", A, "core", "guarded", [
    "I have people waiting. My office will decide your case {respond-in}.",
    "I have to take the next person. You'll hear from my office {respond-in}.",
    "Leave it with the desk. You'll have an answer {respond-in}.",
], ["respond-in"])

# ---- the constituent thanks for what was named (follow: thank) ----
add("follow", "thank", R, "core", "anxious", [
    "Thank you. I'll watch for word from {agency}.",
    "Thank you for taking it to {agency}.",
    "{agency}, then. Thank you.",
], ["agency"], after="promise")
add("follow", "thank", R, "core", "anxious", [
    "Thank you. I'll wait for {staffer}.",
    "Thanks. I'll sit down with {staffer} now.",
    "Thank you. {staffer} it is.",
], ["staffer", "agency"], after="offer")
add("follow", "thank", R, "core", "anxious", [
    "Thank you. I'll leave everything for {agency} at the desk.",
    "Thanks. The desk will have my number for {agency}.",
    "Thank you. I'll write it all down for {agency}.",
], ["agency"], after="offer")

# ---- after a lie that the call was made (lie.believed, lie.caught) ----
# Believed: the constituent thanks you for what they think was done, naming
# the office the case would go to.
add("follow", "thank", R, "core", "anxious", [
    "Thank you. I'll wait to hear from {agency}, then.",
    "Thank you. I didn't know {agency} already had it.",
], ["agency"], after="lie")
add("follow", "accept", R, "core", "guarded", [
    "All right. If {agency} has it, I'll wait.",
    "Then I'll wait on {agency}.",
], ["agency"], after="lie")
# Caught: only where the constituent holds the record that says otherwise.
add("follow", "confront", R, "core", "braced", [
    "I asked {agency} myself. They have nothing from your office.",
    "{agency} told me they never heard from you.",
], ["agency", "knows-truth"], after="lie")

# ---- the constituent presses (follow: press) ----
add("follow", "press", R, "core", "braced", [
    "People have promised me a call from {agency} before.",
    "I'll believe it when {agency} calls me.",
    "I've been sent to {agency} before, and nothing came of it.",
], ["agency"])
add("follow", "press", R, "core", "braced", [
    "My savings are {money-left}. I can't wait long on {agency}.",
    "What I saved is {money-left}. Waiting on {agency} costs me every week.",
], [WORK, "money-left", "agency"])
add("follow", "press", R, "core", "braced", [
    "Every week at {pay} costs me. I can't wait long on {agency}.",
    "I'm still at {pay} an hour while {agency} takes its time.",
], [WAGE, "pay", "agency"])

# ---- turned away: plead, or take it alone (follow: plea, accept) ----
add("follow", "plea", R, "core", "anxious", [
    "If you won't take it, will {agency} even see me?",
    "Then I go to {agency} alone? They don't know my name.",
    "Please. {agency} won't listen to me without your office.",
], ["agency"], after="decline")
add("follow", "plea", R, "core", "anxious", [
    "My savings are {money-left}. Please.",
    "What I saved is {money-left}. Please take it.",
], [WORK, "money-left"], after="decline")
add("follow", "accept", R, "core", "guarded", [
    "Then I'll take it to {agency} myself.",
    "Fine. I'll take it to {agency} without you.",
    "I'll go to {agency} on my own, then.",
], ["agency"], after="decline")

# ---- the close: what happens next, and when ----
add("close", "promise", R, "core", "anxious", [
    "I'll be back {respond-in} if I haven't heard.",
    "If nobody calls, I'm back here {respond-in}.",
], ["respond-in"])
add("close", "thank", R, "core", "anxious", [
    "Thank you. I'll tell my neighbors {agency} has it.",
    "Thanks. I'll be waiting on {agency}.",
], ["agency"])
add("close", "warn", R, "core", "braced", [
    "If {agency} never calls, I'll remember who said they would.",
    "I'll know by {agency} whether you meant it.",
], ["agency"])
add("close", "accept", R, "core", "guarded", [
    "I'll go to {agency} myself, then.",
], ["agency"])
add("close", "press", R, "core", "braced", [
    "I'll be checking with {agency}. And with you.",
], ["agency"])

LIKED_AS = {}
LIKED_AFTER = {}
SIDED = {}


SLOTS = {
    "agency": "The office a constituent's case is referred to when the official takes it up (\"the workforce office\"), by the case's problem in the constituent-cases record.",
    "money-left": "How a job seeker's savings stand, in words and never a figure (\"running low\", \"almost gone\"), from their constituent case's severity.",
    "other-cases": "The official's other open constituent cases (\"three other cases\").",
    "staffer": "The first name of an aide serving on the official's staff, from the staff record.",
    "respond-in": "When the office decides a constituent's case if nobody does sooner (\"in seven days\"), from the case's deadline.",
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
