---
id: core-life-record
title: "Each person keeps a short list of remembered events, written by the engines and the past, read by the journal, the person card, the You screen and the scenes"
area: core
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
after:
blocked-on:
lead: fable
source: Fable build brief, Nov 9, 2026, piece 3 (docs/audits/fable-build-brief-2026-11-09.md on branch audit/fable-vision); Fable audit, root cause 3
standard: 2
model: fable
effort: high
root: design-life-record
---

**What.** The audit's root cause 3: a life holds too little to tell. The records keep births, schools, jobs and moves, and nothing that happened between people. Measured in Blodgett Landing, New Hampshire: a 17-year-old's life is four lines (born 2007, started school 2012, middle school 2018, high school 2021), and the journal says one thing three times. Measured in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af): of 117 full adults aged 25 and up, 115 have a job record, 44 a family record, 21 a school record and one a move; none of the 82 born before 1980 has a school record, because everyone's simulated past starts in the player's birth year. This item gives each full person one short list of remembered events (who, what, when and what it changed), written by the engines that already run (health, justice, partnerships, school, work, elections) and by the simulated past, and makes the journal, the person card, the You screen and the scenes read that one list. It builds no new engine and no new past: an event is remembered when an existing engine's record is one a person would remember.

**Cause.** Design: docs/design/life-record.md and the owner's ruling of Nov 9, 2026 (docs/coordination/OWNER-DECISIONS.md, "History for people older than the player": each person's past covers their own whole life, kept coarse). Measured: Blodgett Landing, New Hampshire, a 17-year-old's life is four lines; Caño Martín Peña, Puerto Rico (seed 50fe2d1143af), 82 adults born before 1980 have no school record.

**Fix.** Give each full person one short list of remembered events, written by the existing engines and the past (health, justice, partnerships, school, work, elections) and read by the Journal, the person card, the You screen and the scenes. Opened relatives who live elsewhere get their school and work past from `schoolHistoryFor` (src/core2/past-school.ts) and `pastWorkFor` (src/core2/past-work.ts). Build no new engine.

**Time box.** 40 hours for a Fable session with helpers on the same model, the design first. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: a remembered event counts only when the journal, a card, a scene or a person's choice reads it, named by record id. No hand-written player text: every sentence about a life comes from the English engine's banks, filled from the event's own fields. No dice: which events a person remembers follows from the records and their traits, never a seeded roll. One model, two tiers: a counted person has no list until filled in, and the list built at fill-in agrees with what the records already say. Owner, November 8: "None of my history is simulated. I can't see anything that my character went through. No, a girlfriend or a car accident or college or whatever."

**Done when.** A second session, not Fable, starts a new game on main in a drawn place it names with its seed, as a character of 35 or older, and takes a screenshot of the You screen, the Journal and the card of the oldest person in the household. Each shows at least six remembered events from different kinds (work, school, a move, a partner, a health event, a loss or a win), each a sentence that names a person, a place or an amount from the records, and Trace on each sentence opens the record that wrote it. The same event reads the same on all three screens. A scene that plays in the first played year cites one of the events by record id. An opened relative who lives elsewhere (for example the player's sister in Agana Heights, Guam, seed 170bfc65-a2ed-43db-9c8f-3665dac576a4) shows schooling in town and the year she left, the same way twice, and SG-P15-kin-light-past is resolved. Then the same check in Caño Martín Peña, Puerto Rico, seed 50fe2d1143af: an adult born before 1980 shows events from before the player's birth year, as the owner ruled. The owner plays it: he opens his own life and a neighbor's and reads what each went through.

**Waits on.** Nothing. The owner call on the past before the player's birth year was answered on Nov 9 (each person's past covers their own whole life, coarse).

**Files.** docs/design/life-record.md, src/core2/past-work.ts, src/core2/past-school.ts, src/core2/past-moves.ts, src/core2/opening-kin.ts, src/core2/modules/people.ts, src/core2/saves.ts, src/bench/card.ts, src/bench/play.mjs, src/core2/data/stopgaps/p15.json

**Notes.** Fable is building this on branch `claude/political-game-audit-build-h6d7tg`. One owner call comes first and was put to him on Nov 10 in Fable's session: whether a person older than the player has a past from before the player's birth year (his Oct 28 ruling answered a question about a 35-year-old player's own childhood; the code applies it to everyone at src/core2/saves.ts near line 135 and src/core2/past-work.ts near line 777). Read: OWNER-DECISIONS (through Nov 9), DECISION-REGISTER, prior-rulings/people.md and opening.md, LAW; searched docs/ and pool for: birth year, past-work, past-school, history before, older than the player; Drive: searched. The You screen's approved content (`docs/mocks/2026-11-07-approved/`) and the scene items `director-casting-rule-on-every-scene-kind` and `director-no-scene-without-a-purpose` read this list once it exists. The memory list dev mode already shows (things heard or seen since day one, fading in weeks) is not this record.

**Notes (Fable, Nov 10, after step 2, #8123).** Seen in the running game in Agana Heights, Guam, seed 170bfc65-a2ed-43db-9c8f-3665dac576a4: a relative who lives outside the town has no story at all. Harper Nolan, the player's 20-year-old sister, reads "Born in 2004" and nothing else, though she grew up in the player's household. Relatives elsewhere are kept as a few facts until met (skill `lives`), and the whole-life past skips them. Step 3 should give an opened relative their schooling in the town and the year they left, from the records the household already holds. Also still open after step 2: a school attended before a person moved here is not named, work before the move has no employer, and people the game makes to hold a role get schooling only (stopgap SG-PEOPLE-role-people-have-no-past).
