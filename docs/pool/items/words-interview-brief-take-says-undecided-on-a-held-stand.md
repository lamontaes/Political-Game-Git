---
id: words-interview-brief-take-says-undecided-on-a-held-stand
title: "A reporter calls a candidate undecided after they declined a question their record holds a stand on"
area: words
lead: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread, Nov 14, interview decline check (train 04a2c7e4 and 9da6e811)
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** In an interview or debate sitting the player picks "Nothing to add on that." on a question their filed stand or record already answers, and the reporter says "Still undecided." That says the candidate has no mind made up, when the record holds one and they chose not to say it. The earlier thanks line ("Short and clear. Thanks.") is already gone from the bank; this is what the same reply still did wrong. Seen at Climax, Georgia (1316908), seed pin-b draw 0, the first question ("Would you vote to allow apartments in single-family zones?", filed stand for): the take before this fix. Seen: the reporter's line after a declined question in an interview or debate sitting.

**Cause.** Found in code: the take after a brief reply is worded from the question's facts (`sitting.now.facts` in `take()` in src/director/sitting.ts), which carry `stance-for` or `stance-against` where the record holds a stand and `no-stand` where it holds none, plus `said-none` for the answer. In data/english/parts/conversation.json the piece `conversation.interview-take-plain-reply-take.still-undecided` was used for the brief take on `said-none` alone, so it played whether or not the record held a stand.

**Fix.** The brief take of "Still undecided." requires `no-stand` and "No comment, then." (already the take after no answer) is used for a brief answer where the question's facts do not carry `no-stand`, in both the interview and the debate. A test reads both cases over eight moments.

**Time box.** 1 hour.

**Rules.** People say how it feels, never the figure. Plain American English. A builder does not judge its own lines; the played file goes to the second reader.

**Done when.** A second session declines a question in an interview at a drawn place and seed where the record holds a stand, and where it holds none, in the running game, and the reporter says "No comment, then." for the first and "Still undecided." for the second.

**Waits on.** The second reader's stamp on the played lines.

**Files.** data/english/parts/conversation.json, src/director/interview-sitting-words.test.ts

**Notes.** Supersedes the finding in words-interview-decline-thanked-as-a-short-answer (the thanks line no longer exists on the train). Filed by hand.
