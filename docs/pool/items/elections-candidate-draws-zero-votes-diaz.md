---
id: elections-candidate-draws-zero-votes-diaz
title: "A candidate on the ballot draws no votes at all, not even their own (Diaz, Arkansas)"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: haiku
effort: low
root: design-electorate-one-model
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** In Diaz, Arkansas (0518940), seed 0bd2561214d2c62a3d06a9caf3a6f74dcda3253acb129f9e8c80d35cafb6e449 (buildBenchWorld, twoLevel), the November 3, 2026 result election-result:contest:seat:gus2025:100398:council:4:2026-11-03 has totals 413 for person_6ef8d97a607e5394 and 0 for person_77751b8ef6cc9999. Both filed with the county clerk on June 6 and are on the ballot, and both are full people living in the place. The same day, council seat 2 split 275 to 138, also 413 cast, so every voter took a side in seat 4 and none chose the runner-up, who did not vote for themselves either. The player sees the 413 to 0 on election night and in the journal ('It wasn't close.'). Found while checking words-own-race-margin-unread; the cause was not traced. One guess to check first: each counted resident stands for the town's people like them (countedScale in src/core2/modules/voting.ts), so if every counted resident prefers one candidate, the other gets nothing.

**Cause.** Measured: it does not reproduce on main. A probe on main d604b3494b built the played world (`buildBenchWorld`, two levels) at Diaz, Arkansas (0518940) with seed 0bd2561214d2c62a3d06a9caf3a6f74dcda3253acb129f9e8c80d35cafb6e449 and played to Nov 5, 2026. The council's seats 0, 2 and 4 are now one at-large ballot: each records the same count, person_65ab65b831def9c1 483, person_7d2b21add6a4fdd9 124 and person_06267b26ae11a7d8 124 counted votes from 483 counted voters, with named votes 61, 60 and 60. Every counted voter backs the first and a share back all three, as a three-seat ballot lets them (`blockShares`, `src/core2/electorate.ts`). No candidate on a contested ballot has zero votes. The item's runner-up, person_77751b8ef6cc9999, now runs unopposed for prosecutor and gets 483 counted votes. The world on main is not the one the item was found in, and its 413-to-0 count is gone.

**Fix.** Nothing to build. Proposed: the CTO closes the item (`npm run pool -- status elections-candidate-draws-zero-votes-diaz done --by=cto`).

**Time box.** 0.5 hours for one Haiku session, only if the CTO keeps the item.

**Rules.** Sliding scales and causes: a vote total moves with the people behind it, and a whole electorate flipping to one side needs a cause on record. One model, two tiers: a counted group votes by the same rule as a full person, times its count. Ask why: name the rule by file and line.

**Done when.** The CTO closes the item. If it is kept, a second session plays Diaz, Arkansas (seed above) and one fresh drawn place (named with its seed) to election night and sees no contested local race where a candidate on the ballot has zero votes, by result record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts

**Notes.** TODO

Nov 11 (cause finder for Fable B): played the item's world to Nov 5, 2026 on main d604b3494b. The council count no longer shows a zero, and the item's zero-vote candidate now runs unopposed for another office, so the case is gone. I propose the CTO closes the item.
