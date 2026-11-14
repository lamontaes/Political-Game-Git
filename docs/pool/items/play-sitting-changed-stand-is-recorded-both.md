---
id: play-sitting-changed-stand-is-recorded-both
title: "When the player answers against a stand they stated or voted before, both are on the record for the press and rivals"
area: play
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: play-sitting-answer-reads-own-stand-on-record
blocked-on:
source: account lead ruling on PR 9152, Nov 14
lead: elections
standard: 2
model: fable
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** A debate or interview now offers both sides of a question and a way not to answer, and what the player picks is stored as their stand. If they pick against what they filed or voted earlier, the earlier stand and the new one are both on the record, but nothing reads the change: a reporter or a rival cannot bring it up. Seen: the reply menu in docs/seen/play-sitting-answer-reads-own-stand-on-record/lines.md, where the player may pick the side that goes against the record.

**Cause.** Design: the answer stored by `row.finish` (src/director/sitting.ts, debate and interview sources) keeps the position and the move only; `interviewQuestions` in src/core2/modules/press.ts scores broken promises and party breaks but not a position that changed between two of the player's own statements. The change needs a rule for what counts as a change (a sign flip, a move of a stated size), read by the press the way `brokenPromiseNewsWeight` reads a broken promise, so it is a sliding weight and never a threshold.

**Fix.** Keep both statements by question and date (the campaign's promises table already keeps each debate statement as a promise only its audience heard); have `interviewQuestions` add a weight for a question where the player's last two statements differ in sign, scaled by how far apart they are, and have the rival's turn line read the earlier statement. Reuse the promises engine; no new table.

**Time box.** 4 hours.

**Rules.** No dice. A stand that rests only on a party's position is never the player's own.

**Done when.** A second session, in a drawn place and seed nobody chose, picks the side against what they filed in one interview, is asked about it in the next interview or debate, and sees the question put with the earlier stand named, by record id.

**Waits on.** The promises thread's work on promises kept, broken and remembered.

**Files.** src/core2/modules/press.ts, src/core2/modules/campaigns.ts, src/director/sitting.ts
