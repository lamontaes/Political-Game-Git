# Mines federal transcripts (U.S. government works, public domain): NASA Johnson
# Space Center and U.S. House Office of the Historian oral histories, and the
# testimony in congressional hearings, for what people actually say to each
# other in everyday conversation: hello and goodbye, asking why, agreeing to a
# plan or turning it down. The words become the choices a player picks in a
# conversation, so each choice is something a real person said.
# Usage:
#   python3 -I mine-talk-choices.py <dir> [<dir> ...] > talk-choice.json
# where each <dir> holds one pdftotext .txt per transcript and a .url beside it
# with the transcript's address. A NASA file name ends in its interview date
# (-M-D-YY); otherwise the first full date on the transcript's opening pages is
# used.
#
# A line counts when a whole sentence says it, spoken in the interview or
# quoted from a conversation the speaker remembers. A line is kept when at
# least two separate transcripts say it, and one of them is from 2015 or later.
# Each kept line is filed under the conversation choice it carries out.
import re, glob, sys, json, collections

NAME = r"[A-Z][a-z]+"
TOPIC = r"(?:the |that |this |your |what )?[A-Za-z][\w' -]{2,40}"

# (choice, text with slots, pattern for the whole sentence). The choices are the
# game's conversation choices (src/presentation/life-conversation.ts). A line
# that answers only one kind of remark, such as "Why not?" after a refusal, is
# not a candidate: a choice is offered whatever was just said.
SHAPES = [
    ("greet", "Hello.", r"Hello[.!]"),
    ("greet", "Hi.", r"Hi[.!]"),
    ("greet", "Hi, {name}.", r"Hi, " + NAME + r"[.!]"),
    ("greet", "Hello, {name}.", r"Hello, " + NAME + r"[.!]"),
    ("greet", "Hey, {name}.", r"Hey, " + NAME + r"[.!]"),
    ("greet", "How are you?", r"How are you\?"),
    ("greet", "How are you doing?", r"How are you doing\?"),
    ("greet", "How's it going?", r"How's it going\?"),
    ("greet", "Good morning.", r"Good morning[.!]"),
    ("greet", "Good afternoon.", r"Good afternoon[.!]"),
    ("greet", "Good evening.", r"Good evening[.!]"),
    ("greet", "Good to see you.", r"(?:It's )?[Gg]ood to see you[.!]"),
    ("greet", "Nice to see you.", r"(?:It's )?[Nn]ice to see you[.!]"),
    ("leave", "Goodbye.", r"Goodbye[.!]"),
    ("leave", "Bye.", r"Bye[.!]"),
    ("leave", "See you later.", r"See you later[.!]"),
    ("leave", "See you tomorrow.", r"See you tomorrow[.!]"),
    ("leave", "Take care.", r"Take care[.!]"),
    ("leave", "I'll see you later.", r"I'll see you later[.!]"),
    ("leave", "I'll talk to you later.", r"I'll talk to you later[.!]"),
    ("leave", "Have a good day.", r"Have a good day[.!]"),
    ("leave", "Good night.", r"Good night[.!]"),
    ("leave", "I've got to go.", r"I(?:'ve)? got(?:ta| to) go[.!]"),
    ("explain", "Why?", r"Why\?"),
    ("explain", "Why is that?", r"Why is that\?"),
    ("explain", "Why do you say that?", r"Why do you say that\?"),
    ("explain", "How come?", r"How come\?"),
    ("explain", "What do you mean?", r"What do you mean\?"),
    ("share", "Can I tell you something?", r"Can I tell you something\?"),
    ("share", "Let me tell you something.", r"Let me tell you something[.!]"),
    ("share", "I want to tell you something.", r"I want to tell you something[.!]"),
    ("share", "I have something to tell you.", r"I(?:'ve got| have) something to tell you[.!]"),
    ("share", "Can I ask you something?", r"Can I ask you something\?"),
    ("share", "I'll tell you something.", r"I'll tell you something[.!]"),
    ("share", "Guess what?", r"Guess what\?"),
    ("share", "You know what?", r"You know what\?"),
    ("share", "Let me tell you.", r"Let me tell you[.!]"),
    ("acknowledge", "I understand.", r"I understand[.!]"),
    ("acknowledge", "I hear you.", r"I hear you[.!]"),
    ("acknowledge", "I see.", r"I see[.!]"),
    ("acknowledge", "That makes sense.", r"That makes sense[.!]"),
    ("acknowledge", "I know.", r"I know[.!]"),
    ("acknowledge", "Okay.", r"(?:Okay|OK)[.!]"),
    ("spendTime", "Do you have a minute?", r"(?:Do you have|Have you got) a minute\?"),
    ("spendTime", "Do you want to get together?", r"Do you want to get together\?"),
    ("spendTime", "Let's get together.", r"Let's get together[.!]"),
    ("spendTime", "Let's sit down.", r"Let's sit down[.!]"),
    ("spendTime", "Let's go get a cup of coffee.", r"Let's go get a cup of coffee[.!]"),
    ("spendTime", "Do you want to go to lunch?", r"Do you want to go to lunch\?"),
    ("spendTime", "Let's go to lunch.", r"Let's go to lunch[.!]"),
    ("spendTime", "Can we talk?", r"Can we talk\?"),
    ("spendTime", "Let's talk.", r"Let's talk[.!]"),
    ("spendTime", "Do you have time?", r"(?:Do you have|Have you got) (?:some )?time\?"),
    ("acceptProposal", "Sure.", r"Sure[.!]"),
    ("acceptProposal", "Sounds good.", r"Sounds good[.!]"),
    ("acceptProposal", "That sounds good.", r"That sounds good[.!]"),
    ("acceptProposal", "That sounds great.", r"That sounds great[.!]"),
    ("acceptProposal", "I'd love to.", r"I'd love to[.!]"),
    ("acceptProposal", "Let's do it.", r"Let's do it[.!]"),
    ("acceptProposal", "Absolutely.", r"Absolutely[.!]"),
    ("acceptProposal", "Of course.", r"Of course[.!]"),
    ("declineProposal", "No, thank you.", r"No, thank you[.!]"),
    ("declineProposal", "No, thanks.", r"No, thanks[.!]"),
    ("declineProposal", "Not right now.", r"Not right now[.!]"),
    ("declineProposal", "Not today.", r"Not today[.!]"),
    ("declineProposal", "Maybe some other time.", r"Maybe (?:some )?other time[.!]"),
    ("declineProposal", "I can't.", r"I can't[.!]"),
    ("declineProposal", "I'd rather not.", r"I'd rather not[.!]"),
    ("cancelProposal", "I can't make it.", r"I can't make it[.!]"),
    ("cancelProposal", "Something came up.", r"Something came up[.!]"),
    ("cancelProposal", "I won't be able to make it.", r"I won't be able to make it[.!]"),
    ("cancelProposal", "I'm not going to be able to make it.", r"I'm not going to be able to make it[.!]"),
    ("cancelProposal", "I can't go.", r"I can't go[.!]"),
    ("cancelProposal", "I can't do it.", r"I can't do it[.!]"),
    ("cancelProposal", "I have to cancel.", r"I(?:'m going to)? ha(?:ve|ve got) to cancel[.!]"),
    ("nothing", "Never mind.", r"Never ?mind[.!]"),
    ("nothing", "It can wait.", r"It can wait[.!]"),
    ("nothing", "Forget it.", r"Forget it[.!]"),
    ("nothing", "It's nothing.", r"It's nothing[.!]"),
    ("activity", "What do you want to do?", r"What do you want to do\?"),
    ("activity", "What would you like to do?", r"What would you like to do\?"),
    ("scene", "What's going on?", r"What's going on\?"),
    ("scene", "What's happening?", r"What's happening\?"),
    ("scene", "What happened?", r"What happened\?"),
    ("scene", "What's going on here?", r"What's going on here\?"),
    ("officials", "What do you think of {official}?", r"What do you think of " + NAME + r"(?: " + NAME + r")?\?"),
    ("officials", "What do you think of the {office}?", r"What do you think of the [a-z]+(?: [a-z]+)?\?"),
    ("officials", "What do you think about the {office}?", r"What do you think about the [a-z]+(?: [a-z]+)?\?"),
    ("officials", "How do you feel about {official}?", r"How do you feel about " + NAME + r"(?: " + NAME + r")?\?"),
    ("officials", "What do you think about {official}?", r"What do you think about " + NAME + r"(?: " + NAME + r")?\?"),
    ("matter", "Did you hear about {topic}?", r"Did you hear about " + TOPIC + r"\?"),
    ("matter", "Have you heard about {topic}?", r"Have you heard about " + TOPIC + r"\?"),
    ("remember", "Do you remember {topic}?", r"Do you remember " + TOPIC + r"\?"),
    ("remember", "Remember when we talked about {topic}?", r"Remember when we talked about " + TOPIC + r"\?"),
]
COMPILED = [(choice, text, re.compile(pattern + r"$")) for choice, text, pattern in SHAPES]

MONTHS = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], 1)}


def date_of(name):
    m = re.search(r"-(\d{1,2})-(\d{1,2})-(\d\d)$", name)
    if not m:
        return None
    month, day, year = int(m.group(1)), int(m.group(2)), 2000 + int(m.group(3))
    if year > 2030:
        year -= 100
    return f"{year:04d}-{month:02d}-{day:02d}"


def date_in(text):
    """The first full date on a transcript's opening pages: when it was recorded."""
    m = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), ((?:19|20)\d\d)", text[:6000], re.I)
    return f"{int(m.group(3)):04d}-{MONTHS[m.group(1).capitalize()]:02d}-{int(m.group(2)):02d}" if m else None


def document_of(url):
    if "govinfo.gov" in url:
        return "Congressional hearing transcript"
    if "house.gov" in url:
        return "U.S. House of Representatives, Office of the Historian, oral history transcript"
    return "NASA Johnson Space Center Oral History Project transcript"


def sentences(text):
    """Every sentence said aloud: the transcript's own, and each quoted one."""
    said = re.split(r"(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<=[.?!])\s+(?=[A-Z\"])", text)
    for quoted in re.findall(r"\"([^\"]{1,200})\"", text):
        said.extend(re.split(r"(?<=[.?!,])\s+(?=[A-Z])", quoted.strip()))
    for sentence in said:
        sentence = re.sub(r"^[A-Z]{2,}(?: [A-Z]{2,})*:\s*", "", sentence.strip().strip("\"").strip())
        # A quotation ending in a comma ("Hello," he said) still says the line.
        sentence = re.sub(r",$", ".", sentence)
        if sentence:
            yield sentence


docs = collections.defaultdict(set)
cite = {}
read = 0
for folder in sys.argv[1:]:
    for path in sorted(glob.glob(folder + "/*.txt")):
        name = path.rsplit("/", 1)[-1][:-4]
        try:
            url = open(path[:-4] + ".url").read().strip()
        except FileNotFoundError:
            continue
        read += 1
        text = re.sub(r"\s+", " ", open(path, errors="ignore").read())
        text = text.replace("’", "'").replace("“", "\"").replace("”", "\"")
        date = date_of(name) or date_in(text)
        for sentence in sentences(text):
            if len(sentence) > 80:
                continue
            for choice, shape, pattern in COMPILED:
                if pattern.match(sentence):
                    docs[shape].add(name)
                    if date and date >= "2015-01-01" and shape not in cite:
                        cite[shape] = (date, url, name)


def key(choice, shape):
    words = re.sub(r"\{(\w+)\}", r"\1", shape).lower().replace("'", "")
    slug = "-".join(re.sub(r"[^a-z]+", "-", words).strip("-").split("-")[:8])
    return f"talk-choice.{choice}.{slug}"


parts = []
for choice, shape, _ in SHAPES:
    if len(docs.get(shape, ())) < 2 or shape not in cite:
        continue
    date, url, name = cite[shape]
    parts.append({
        "key": key(choice, shape),
        "move": choice,
        "kind": "spoken",
        "text": shape,
        "transcriptsUsing": len(docs[shape]),
        "shippable": True,
        "source": {"document": document_of(url), "date": date, "granule": name, "url": url},
    })
bank = {
    "schema": "english-parts/1",
    "register": "talk-choice",
    "description": "What people actually say to each other in everyday conversation, mined from federal transcripts (public domain): NASA Johnson Space Center and U.S. House oral histories and congressional hearing testimony, counting both what was said in the interview and conversations the speaker quotes. Each part is a whole sentence a player can choose to say; its move is the conversation choice it carries out (src/presentation/life-conversation.ts). transcriptsUsing counts the transcripts that say it.",
    "slots": {
        "name": "The given name of the person the player is talking to, from the person's record.",
        "official": "An official the player could ask about, by name, from the officeholder records.",
        "office": "The office that official holds, in lower case, such as mayor or governor, from the officeholder records.",
        "topic": "What the player would bring up: a news headline or an earlier conversation's subject, from the records.",
    },
    "maxWords": 8,
    "mining": {
        "tool": "scripts/english-mining/mine-talk-choices.py",
        "read": f"{read} transcripts: NASA Johnson Space Center Oral History Project, U.S. House Office of the Historian oral histories, and congressional hearings from 2015 to 2024 on govinfo.gov.",
        "rule": "A line is kept when at least two transcripts say it as a whole sentence, and one of them is from 2015 or later.",
        "shapesSeen": {shape: len(d) for shape, d in sorted(docs.items())},
    },
    "parts": parts,
}
print(json.dumps(bank, indent=2, ensure_ascii=False))
