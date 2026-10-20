---
id: gov-contract-award-weights-review
title: "Review the contract award weights (calibrated bands, not deciders)"
area: gov
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: "post-merge audit Oct 19 evening, item 7 (PR #5166)"
---

**What.** PR #5166 decides public contract awards to town businesses by four cited TUNABLE weights, each with a spread. The weights should set calibrated bands, not decide the award; the officials' reads should decide it. Confirm that the weights are calibrated bands, and replace the fixed rule with the officials' reads where it still decides.

**Rules.** No dice: bodies act from members' reasons and the calendar, not a roll. Ask why and the rest: the cited weights are only as good as the reasons they stand for.

**Done when.** A drawn-place world from buildBenchWorld, seed named in the PR body, shows an award decided by the officials' reads with the weights only setting the band. The contracts test in `src/core2/contracts.test.ts` covers it.

**Files.** src/core2/modules/contracts.ts, src/core2/data/contracts/parameters.json, src/core2/modules/legislature.ts

**Notes.** Found in the post-merge audit of Oct 19 evening. Leave PR #5166 as merged.

Reviewed Oct 20 (claude, claude/political-game-pool-yucp92-s), not fixed. Four drawn towns, 400 played days each, 106 awards (all with two or more bids): the cheapest bidder won 67, the largest won 72, and the members split between firms in only 11. In the other 95 every member ranked the same firm first. Why: price and workforce are the same for every member and rank the firms the same way whatever the weights' size; only the tie to the owner differs by member, and a member rarely knows a business owner (closeness is zero for strangers), so the officials' traits never change a ranking. The weights are therefore not the problem (a scale on a shared term cannot change who wins); the officials have too little to read. A fix needs a second read per member about each firm that most members hold, for example the member's closeness to the firm's workers, or whether the member or their household bought from it, and a record of which read decided each split. That is a design choice for the Government line (which reads count as the official's knowledge of a firm); build it as a new item once chosen. The cited weights keep their spreads.
