# Mines Federal Open Market Committee minutes (U.S. government works, public domain)
# for sourced minutes-register parts: how formal minutes record attendance, discussion,
# agreement, dissent and votes. Usage: python3 -I mine-meeting-minutes.py <dir>, where
# <dir> holds fomcminutesYYYYMMDD.htm pages from https://www.federalreserve.gov/monetarypolicy/.
import re, glob, html, sys, json, collections

FORMULAS = [
    ("attendance", r"\bAttended (?:Tuesday's|Wednesday's) session only\.", "Attended {day}'s session only."),
    ("attendance", r"\bAttended through the discussion of ", "Attended through the discussion of {topic}."),
    ("attendance", r"\bAttended opening remarks for ", "Attended opening remarks for {session} only."),
    ("attendance", r"\bvoted as an alternate member at this meeting\.", "{member} voted as an alternate member at this meeting."),
    ("discussion", r"\bThe manager turned first to ", "The manager turned first to {topic}."),
    ("discussion", r"\bThe manager then turned to ", "The manager then turned to {topic}."),
    ("discussion", r"\bThe manager turned next to ", "The manager turned next to {topic}."),
    ("discussion", r"\bThe staff provided an update on ", "The staff provided an update on {topic}."),
    ("discussion", r"\bParticipants discussed ", "Participants discussed {topic}."),
    ("discussion", r"\bIn their discussion of [^,]+, participants ", "In their discussion of {topic}, participants {view}."),
    ("discussion", r"\bIn their consideration of [^,]+, participants noted that ", "In their consideration of {topic}, participants noted that {view}."),
    ("discussion", r"\bAgainst this background, ", "Against this background, {view}."),
    ("discussion", r"\bThe staff judged that ", "The staff judged that {view}."),
    ("agreement", r"\bMembers concurred that ", "Members concurred that {view}."),
    ("agreement", r"\bMembers also concurred that ", "Members also concurred that {view}."),
    ("agreement", r"\bParticipants agreed that ", "Participants agreed that {view}."),
    ("agreement", r"\bMembers agreed that ", "Members agreed that {view}."),
    ("agreement", r"\bAlmost all members agreed that ", "Almost all members agreed that {view}."),
    ("agreement", r"\bAll participants judged it appropriate to ", "All participants judged it appropriate to {action}."),
    ("agreement", r"\bParticipants judged that it was appropriate to ", "Participants judged that it was appropriate to {action}."),
    ("agreement", r"\bMembers also acknowledged that ", "Members also acknowledged that {view}."),
    ("agreement", r"\bThey also agreed that ", "They also agreed that {view}."),
    ("agreement", r"\bMembers viewed ", "Members viewed {subject} as {judgment}."),
    ("weighing", r"\bMany participants (?:noted|remarked|observed|commented) that ", "Many participants noted that {view}."),
    ("weighing", r"\bSeveral participants (?:noted|remarked|observed|commented) that ", "Several participants noted that {view}."),
    ("weighing", r"\bSome participants (?:noted|remarked|observed|commented) that ", "Some participants noted that {view}."),
    ("weighing", r"\bA few participants (?:noted|remarked|observed|commented) that ", "A few participants noted that {view}."),
    ("weighing", r"\bA couple of participants (?:noted|remarked|observed|commented) that ", "A couple of participants noted that {view}."),
    ("weighing", r"\bMost participants (?:noted|remarked|observed|commented) that ", "Most participants noted that {view}."),
    ("weighing", r"\bOne participant (?:noted|remarked|observed|commented) that ", "One participant noted that {view}."),
    ("weighing", r"\bParticipants who commented noted ", "Participants who commented noted {view}."),
    ("weighing", r"\bThe extent of these effects remain(?:s|ed) uncertain\.", "The extent of these effects remains uncertain."),
    ("vote", r"\bBy unanimous vote, the Committee ", "By unanimous vote, the {body} {action}."),
    ("vote", r"\bVoting for this action: ", "Voting for this action: {members}."),
    ("vote", r"\bVoting against this action: ", "Voting against this action: {members}."),
    ("vote", r"\bdissented because ", "{member} dissented because {reason}."),
    ("vote", r"\bpreferred to ", "{member} preferred to {alternative}."),
    ("vote", r"\bIt was agreed that the next meeting of the Committee would be held on ", "It was agreed that the next meeting of the {body} would be held on {date}."),
    ("vote", r"\bThe meeting adjourned at ", "The meeting adjourned at {time}."),
    ("vote", r"\bwere approved\.", "The minutes of the meeting held on {date} were approved."),
]

hits = collections.defaultdict(list)
for f in sorted(glob.glob(sys.argv[1] + "/fomcminutes*.htm")):
    name = f.split("/")[-1][:-4]
    stamp = re.sub(r"\D", "", name)[:8]
    src = {"document": "Minutes of the Federal Open Market Committee", "date": f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}", "url": f"https://www.federalreserve.gov/monetarypolicy/{name}.htm"}
    t = re.sub(r"<[^>]+>", " ", open(f, errors="ignore").read())
    t = re.sub(r"\s+", " ", html.unescape(t)).replace("’", "'")
    for i, (_, rx, _) in enumerate(FORMULAS):
        if re.search(rx, t):
            hits[i].append(src)

for i, (move, _, shape) in enumerate(FORMULAS):
    srcs = sorted(hits.get(i, []), key=lambda s: s["date"])
    if srcs:
        print(json.dumps({"move": move, "text": shape, "count": len(srcs), "source": srcs[-1]}))
