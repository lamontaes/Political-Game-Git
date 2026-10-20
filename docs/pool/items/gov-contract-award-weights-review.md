---
id: gov-contract-award-weights-review
title: "Review the contract award weights (calibrated bands, not deciders)"
area: gov
kind: research
priority: 2
size: S
status: blocked
claimed-by: claude/political-game-pool-yucp92-s
pr:
after:
blocked-on:
milestone:
source: "post-merge audit Oct 19 evening, item 7 (PR #5166)"
claimed-at: 2026-10-20T01:27:02.279Z
---

**What.** Change src/core2/modules/contracts.ts so the four TUNABLE weights in src/core2/data/contracts/parameters.json set bands and the members' reads decide. Today award() scores each firm as one weighted sum of price, capacity and closeness to the owner and the trait lean only slides the price and tie weights, so the formula decides. Give each member a second read of each firm that is theirs: the firm's record on this government's earlier awards (the contracts table: whether the last line was paid out and its workforce held) and, for a full person, their view of the firm's owner from closeness. Each read is clamped into the weight's band, so no weight can by itself outvote the others, and the member's decisionLean picks which reads count; the weights stay only as cited band limits with their spread.

**Rules.** No dice: the winner comes from members' reads and the body's vote, never a roll or a fixed score that decides alone. Ask why: each member's vote cites the reads that ranked the firm first, in the award row's votes. An effect is a read, not a record: the award row's reasons are read by the treasury and by gov-bribe-buys-a-contract when it changes a ranking. Estimate, never UNKNOWN: a firm with no earlier award starts from the bidders' average with the spread, not a zero. Replace, never layer: the single weighted sum is deleted in the same change.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (named in the test output), a government's award shows each member's vote with the reads behind it by record id, and changing one member's traits changes their ranking without any weight change; src/core2/contracts.test.ts proves it, and the weights are each marked as band limits with a spread in parameters.json.

**Files.** src/core2/modules/contracts.ts, src/core2/data/contracts/parameters.json, src/core2/contracts.test.ts

**Notes.** Found in the post-merge audit of Oct 19 evening. Leave PR #5166 as merged.

Oct 20 (pool feeder): spec written; the 'second read' the block asked for is the firm's earlier-award record from the contracts table plus the member's closeness to the owner, both already in the core, so nothing needs an owner call. Members' views (the stance engine) are not read here because contracts have no policy question; that stays a later addition.
