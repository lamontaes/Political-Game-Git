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
model: opus
effort: medium
root: design-electorate-one-model
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** In Diaz, Arkansas (0518940), seed 0bd2561214d2c62a3d06a9caf3a6f74dcda3253acb129f9e8c80d35cafb6e449 (buildBenchWorld, twoLevel), the November 3, 2026 result election-result:contest:seat:gus2025:100398:council:4:2026-11-03 has totals 413 for person_6ef8d97a607e5394 and 0 for person_77751b8ef6cc9999. Both filed with the county clerk on June 6 and are on the ballot, and both are full people living in the place. The same day, council seat 2 split 275 to 138, also 413 cast, so every voter took a side in seat 4 and none chose the runner-up, who did not vote for themselves either. The player sees the 413 to 0 on election night and in the journal ('It wasn't close.'). Found while checking words-own-race-margin-unread; the cause was not traced. One guess to check first: each counted resident stands for the town's people like them (countedScale in src/core2/modules/voting.ts), so if every counted resident prefers one candidate, the other gets nothing.

**Cause.** Measured: Diaz, Arkansas (0518940), world seed 0bd2561214d2c62a3d06a9caf3a6f74dcda3253acb129f9e8c80d35cafb6e449, built with `buildBenchWorld` (two-level) and played to November 5, 2026 on the train at df168042e6 by a scratch script (not committed) that printed every result of November 3, 2026. The 413 to 0 is gone. Council seats 0, 2 and 4 are now counted as one race for three seats (commit 83cbd0815b8, Nov 4: "a body's at-large seats up on one day are counted as one race"), with five candidates: person_0f5a31c83e38e9f1 344, person_8f44ea27c0ae3afa 137, person_342a110a3ca26f6e 130, person_8f42accb5d5c4ead 97 and person_04ea3a1dbd5c0954 47, and the first three seated. The mayor's race is 393 to 43 and the one contested county board seat 1,381 to 648. No candidate on any of the 32 results that day has no votes. The item's guess was right about the old count: each counted resident then gave the whole of what they stood for to one candidate. The count now divides a counted group among the candidates by shares (`countedShareRule` in src/core2/modules/voting.ts), so a second candidate is no longer left with nothing.

**Fix.** Nothing to build. Close this item as dropped; the status is left for the lead to set.

**Time box.** 5 hours for one Opus session, to trace the votes and then fix the rule.

**Rules.** Sliding scales and causes: a vote total moves with the people behind it, and a whole electorate flipping to one side needs a cause on record. One model, two tiers: a counted group votes by the same rule as a full person, times its count. Ask why: name the rule by file and line.

**Done when.** A second session reproduces the Diaz, Arkansas result on that seed and finds the runner-up's total explained by record: the candidate's own ballot and their household's are counted where they voted, or the rule that sends them elsewhere is named by file and line. A test in a drawn place (name and seed written down) fails on main when a candidate who voted is not counted for themselves. In the running game on election night the result sheet in that place shows a close split with a cause per voter group.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts

**Notes.** TODO
