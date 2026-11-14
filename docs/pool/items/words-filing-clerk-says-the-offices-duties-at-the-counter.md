---
id: words-filing-clerk-says-the-offices-duties-at-the-counter
title: "The filing clerk says what the office does without being asked, in one talk at the counter that also holds the fee and the filing"
area: words
kind: feature
priority: 2
size: M
status: open
standard: 2
after: elections-filing-fee-paid
blocked-on:
model: opus
effort: medium
root: none
source: found by the #9153 filing-fee carry thread, Nov 14, with the account lead
lead: words
---

**What.** At the filing counter the player names an office and the clerk answers with the race (dates, term, body) and never says what the job is. The owner's Oct 28 sitting, item 32, asks that the clerk say the office's duties unprompted: "you're running for Trustee ... here is what a trustee does, here is the term". The talk is also too shallow for the red `src/director/scene-talk.test.ts` "composes a tree" case, which wants a tree depth of 2 and gets 1 for the filing types. Seen: the filing counter in any drawn place, after "I want to run for ...".

**Cause.** Found in code: the clerk's talk lives in two places. `composeSceneTalk` (`src/director/scene-talk.ts`) builds the composed scene tree for the `filing-clerk` purpose, which has depth 1 (one statement, then replies that end the scene). The counter moves sit beside it in `src/director/filing-visit.ts` (`pickContest`, the fee line `tell-filing-fee`, `refusedAtCounter`, `offerComeBack`, `filedAtCounter`) and are never nodes of that tree. The test checks the tree only, so the fee and refusal do not count toward depth, and nothing in either place says the office's duties.

**Fix.** One talk, not a tree beside a list of moves. Make each counter move a node of the clerk's scene tree: the statement says the race and then, from the office record (`offices` table, `bodyName`, `seats`, the same record `bodyOf` in `src/bench/filing.ts` reads), what the office does, in bank pieces under `scene-talk.json` with the slot filled from that record; the next node is the fee (where `checkEligibility` returns a `filing-fee` check) with the player's replies "file" and "I'll come back with it"; a try without the fee reaches the refusal node, and a paid filing reaches the paid node. `filedAtCounter` and `comeBackLater` follow the node the player is on (`followReply` already walks the path). The depth is then real: statement, duties, fee, filing. No reply is added to reach a depth.

**Time box.** 4 hours for one Opus session; the lines are the Words lead's.

**Rules.** No dice. Words come from the bank. One rule, all 56 places: no office is named in the logic, the duties come from the office record. A figure is said once.

**Done when.** A second session plays two drawn places, one office with a fee and one without, at the counter: the clerk says what the office does, then (where there is one) the fee, and the talk is one run of the same scene; the "composes a tree" case in `src/director/scene-talk.test.ts` passes for the filing types; names the places and seeds.

**Waits on.** elections-filing-fee-paid (#9153).

**Files.** src/director/filing-visit.ts, src/director/scene-talk.ts, src/bench/filing.ts, data/english/parts/scene-talk.json, src/director/scene-talk.test.ts

**Notes.** Filed by the #9153 carry thread, Nov 14. Owner's Oct 28 sitting, item 32 (clerk says the office's duties unprompted). The account lead ruled this comes after #9153 and before petition in lieu; the fee, refusal and "I'll come back with it." lines of #9153 are the nodes it joins to the tree.
