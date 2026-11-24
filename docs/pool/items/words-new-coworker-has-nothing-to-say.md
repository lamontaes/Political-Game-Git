---
id: words-new-coworker-has-nothing-to-say
title: "A newcomer the player met at work has nothing to say to them for two weeks, so a promise to show them around always breaks"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Promises thread (#9192), Nov 15, 2026, carrying #9192 onto the train 2190669e
---

**What.** The player is hired, a newcomer is hired at the same place, the first-meeting scene plays, and the player promises to show them around. A talk between the two keeps that promise (data/promise-kinds.json, show-around). The train changed one thing (#9247 / the Words lead's Nov 14 rule in `introduction`, src/director/conversation.ts): two who have already met are no longer introduced. Since then, in Pillsbury, North Dakota (3862540), world seed ba755e9fd619be92f6179bdbf1fa60687ed91fcc9c051ced1064e15ff811818a (promises.test.ts, seed promises-kept-and-broken-1, draw coworker:0), `openConversation(player, newcomer)` comes back empty, with no lines and no choices, on every second day for 14 days. The promise then breaks with no chance to keep it. promises.test.ts now passes this place over by name. Seen: the newcomer at work offers no talk on the player's later days.

**Cause.** Measured: at Pillsbury ND, world seed ba755e9f…, `npx vitest run src/director/promises.test.ts -t "show a new coworker"`: `mainTopic` finds one subject with weight above zero: the President's `address`, asked by the newcomer. `askSubject` drops it because the player has no answer. The fallback, `otherAsks(OPENING_ORDER)`, then tries `own-work`, `home` (asked as `home-new`) and three `kin`. Every one of those asks returns false. `otherRaises` then finds only `own-work`, and that fails too. The other subjects the two have are their-position, their-school and own-view, and none of them is in OPENING_ORDER. Not yet traced: why the `own-work` ask and raise are not worded between two people who work at the same place (topic memory from the first-meeting talk, or `canGiveBack`).

**Fix.** Trace the `own-work` ask and raise for this pair at this seed. Make a coworker whom the player has met able to talk about work on a later day, through the existing rules; no second opener and no new weight. The fix ships when this place keeps the promise in promises.test.ts and no longer needs to be passed over.

**Time box.** 2 hours

**Rules.** No hand-written player text: the coworker's words come from the existing banks and rules, never a line typed in code. Talk is dialogue only; a question offered is answered from a record; no tuned weight that makes one subject win.

**Done when.** promises.test.ts keeps the show-around promise at Pillsbury ND (draw coworker:0) with "Passed over: none". A second session also opens a talk with a newly met coworker in the running game, in a drawn place, on a later day and gets something said.

**Waits on.** Nothing

**Files.** src/director/conversation.ts (mainTopic, otherAsks, otherRaises, askSubject), src/director/promises.test.ts

**Notes.** Found by the promises thread on Nov 15, 2026, at head b0a3cf70e5 plus the test change.
