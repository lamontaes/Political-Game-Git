---
id: elections-candidate-draws-zero-votes-diaz
title: "A candidate on the ballot draws no votes at all, not even their own (Diaz, Arkansas)"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Diaz, Arkansas (0518940), seed 0bd2561214d2c62a3d06a9caf3a6f74dcda3253acb129f9e8c80d35cafb6e449 (buildBenchWorld, twoLevel), the November 3, 2026 result election-result:contest:seat:gus2025:100398:council:4:2026-11-03 has totals 413 for person_6ef8d97a607e5394 and 0 for person_77751b8ef6cc9999. Both filed with the county clerk on June 6 and are on the ballot, and both are full people living in the place. The same day, council seat 2 split 275 to 138, also 413 cast, so every voter took a side in seat 4 and none chose the runner-up, who did not vote for themselves either. The player sees the 413 to 0 on election night and in the journal ('It wasn't close.'). Found while checking words-own-race-margin-unread; the cause was not traced. One guess to check first: each counted resident stands for the town's people like them (countedScale in src/core2/modules/voting.ts), so if every counted resident prefers one candidate, the other gets nothing.

**Rules.** Sliding scales and causes: a vote total moves with the people behind it, and a whole electorate flipping to one side needs a cause on record. One model, two tiers: a counted group votes by the same rule as a full person, times its count. Ask why: name the rule by file and line.

**Done when.** On that seed and place the runner-up's total is explained by record in the PR body: the candidate's own ballot and their household's are counted where they voted, or the rule that sends them elsewhere is named by file and line. A test in a drawn place, named with its seed, fails on main when a candidate who voted is not counted for themselves.

**Files.** src/core2/modules/voting.ts

**Notes.** TODO
