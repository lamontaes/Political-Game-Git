---
id: words-home-talk-answers-drop-the-players-name
title: "Home talk: the answers back no longer end in the player's name to pass the insert guard"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by: Story lead (claude/dazzling-wozniak-vgomoz-you-padded)
pr:
after:
blocked-on:
lead: words
model: fable
effort: high
root: none
source: owner, Nov 14 06:38Z (card: "The padded names come out"); the Story lead's count of Nov 17
---

**What.** In the talks at home, 112 of the answers a housemate gives back ended in the player's name as the speaker says it ("Just be here, Alex.", "I'm proud of you, Alex."), and 12 of the player's own replies about a housemate's view ended in the housemate's first name. The names were there to pass the insert guard, which the owner ruled against on Nov 14, and the padded-name check did not read the two slots they used. The lines now say the thing from the record or stand on their own.
Seen: at Washburn, Maine (seed 21) and in the owner's Nov 16 play the name closed every agreeing reply; the same pattern ran through the news, rent, school, illness, death and job-lost answers.

**Cause.** Found in code: tests/guards/english/line-inserts.test.ts, `VOCATIVE` matched only `{first}`, `{their-first}` and `{player-first}`, so a line ending in `, {you}.` or `, {first}.` under another move passed; data/english/parts/conversation.json held 112 `{you}`-padded answers across 21 subjects and 12 `{first}`-padded own-view replies (counted by a pass over the bank on Nov 17).

**Fix.** In conversation.json: 25 answers rewritten with a record insert their subject sets (what the story is about, the hours worked, the school, the employer, the office, the illness, who decides), 86 answers lose the name and stand on their own, 17 thanks and first-meeting lines keep it by the Words lead's allowance, and the 12 own-view replies name the question or who decides it. `VOCATIVE` reads `{you}` and allows a first meeting by key, with fixtures. The player sees it in every talk at home.

**Time box.** 3 hours for the Story lead on Fable at high effort, plus the played proof.

**Rules.** Replace, never layer: the padded lines are rewritten or stripped in place, none kept beside a copy. Ask why: an insert is a fact of the talk's own record, never the town or the listener for its own sake.

**Done when.** A second session, on main, plays sixty evenings at home in a drawn place (buildBenchWorld, a seed nobody chose) and reads every answer a housemate gives back: none ends in the player's name except a thanks or a first meeting; `tests/guards/english/line-inserts.test.ts` is green with `vocativeNames.conversation` at 0; the rewritten answers are seen said in a played talk or stripped instead.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json, tests/guards/english/line-inserts.test.ts, tests/guards/english/line-inserts-baseline.json

**Notes.** Filed by the Story lead, Nov 17. Stripping a name from a line whose only insert it was raises the insert count for conversation (13 on main's guard before #9757; recounted after it); the owner's Nov 14 order is the reason, and the PR asks the CTO for the line. The other `{name}`-ending lines in the banks name the subject of a sentence (a death notice, an appositive) and are not padding.
