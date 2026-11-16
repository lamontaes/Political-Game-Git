---
id: press-reporter-names-alderman-race-as-council-member
title: "The paper calls a race for the Board of Aldermen a race for council member"
area: words
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: carry-press-title
pr: #9299
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc2-done-from-records
source: The Account lead's list of faults found in play, Nov 14, 2026
checked:
claimed-at:
---

**What.** The reporter's call to the player says "the council member race" where the clerk said alderman: at Shelby, Mississippi (2867040, place seed b9c9caeca52322c89c12ddea061719a6525f2e846c2e89bae66a1b2091f26977) the invitation reads "I'd like to do a real, sit-down interview about the council member race" after the clerk's "You'd have a seat on the Shelby Board of Aldermen" (the interview play check of Nov 14, train 04a2c7e4). In a town governed by a Board of Aldermen the paper prints the race for that board with the form's own title. A debate story reads "Council member candidates face off" and "The candidates for Council member debated", where the town's own word is alderman. The same title leaked into the filing, petition-check and unfilled-seat stories and into the "won the race for" lines.

Seen: the reporter's invitation call and the paper's race stories in a town with a Board of Aldermen.

**Cause.** Found in code: the director's `composeBinding` in src/director/purpose-scene.ts filled the scene's `office` fact from the cause record's `office`, which the press writes as the contest's `title` ("Council member"), through `titleInSentence`, so the interview and debate invitations never asked the seat reader. And src/bench/printed-words.ts passes the contest record's `title` ("Council member", set for every city council in src/core2/offices-local.ts) straight into the filing, petition-check, debate and election-result builders. The one seat reader, `seatSaid` in src/english/journal-words.ts, already turns a body named for its members into that member ("alderman") from data/english/seat-words.json, but those builders never asked it.

**Fix.** `raceMemberTitle` in src/director/cause-facts.ts reads the contest's office record and says the member of a body named for its members, through `memberOfBody` in src/english/journal-words.ts (the table `seatSaid` reads); `composeBinding` and the paper's `Reader.contestOffice` both call it. One function, `memberOfBody` in src/english/journal-words.ts (the same table `seatSaid` reads), says the member of a body named for its members. `Reader.contestOffice` in src/bench/printed-words.ts applies it to the contest's office record, and the four builders and `contestTitle` use it. A body named as a body keeps the record's title, so only places with a Board of Aldermen, Trustees and the like change a line.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One rule, all 56 places: the member word comes from the body's name and the seat-words table, never a place name. No hand-written player text in code. Replace, never layer: no second title table.

**Done when.** A second session starts a new life in a drawn town that has a Board of Aldermen (Mississippi, Louisiana and most Missouri cities do), reads the paper through a campaign season, and sees the race named "alderman" in every story; in a town with a council the same stories still say "council member".

**Waits on.** Nothing.

**Files.** src/bench/printed-words.ts, src/english/journal-words.ts, src/director/cause-facts.ts, src/director/purpose-scene.ts, src/bench/race-story-office-title.test.ts (new), src/director/interview-invite-seat.test.ts (new)

**You will see.** "I'd like to do a real, sit-down interview about the alderman race" from the reporter, and "Candidates for alderman debate" in the paper, in a town with a Board of Aldermen.

**Notes.** Built in the carry thread for this item; the test pins Aberdeen MS, Abita Springs LA and Adrian MO for aldermen and Searsboro IA for a council. The filing and petition-check builders take the same path as the debate one; the test exercises the debate story, which the paper prints for any race.
