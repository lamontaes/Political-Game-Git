---
id: gov-contract-award-weights-review
title: "Review the contract award weights (calibrated bands, not deciders)"
area: gov
kind: research
priority: 3
size: S
status: dropped
claimed-by:
pr:
after:
blocked-on:
milestone:
source: "post-merge audit Oct 19 evening, item 7 (PR #5166)"
claimed-at:
lead: governing
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** Change the contract award so the four TUNABLE weights set bands and the members' reads decide. Today `award()` scores each firm as one weighted sum of price, capacity and closeness to the owner, and the trait lean only slides the price and tie weights, so the formula decides. Reviewed Oct 20 over four drawn towns, 400 played days each, 106 awards (all with two or more bids): the cheapest bidder won 67, the largest won 72, and the members split between firms in only 11. In the other 95 every member ranked the same firm first, because price and workforce are the same for every member and only the tie to the owner differs, and a member rarely knows a business owner. The officials have too little to read.

**Cause.** Found in code: `src/core2/modules/contracts.ts` `award` (line 169) scores each firm as one weighted sum from the four TUNABLE weights in `src/core2/data/contracts/parameters.json`; measured Oct 20 in four drawn towns, 106 awards (cheapest won 67, members split in 11).

**Fix.** Give each member a second read of each firm: the firm's record on this government's earlier awards (the contracts table: whether the last line was paid out and its workforce held) and, for a full person, their view of the firm's owner from closeness. Clamp each read into its weight's band, let `decisionLean` pick which reads count, record which read decided each vote, and delete the single weighted sum. A firm with no earlier award starts from the bidders' average with the spread.

**Time box.** 6 hours for one opus session.

**Rules.** No dice: the winner comes from members' reads and the body's vote, never a roll or a fixed score that decides alone. Ask why: each member's vote cites the reads that ranked the firm first, in the award row's votes. An effect is a read, not a record: the treasury and gov-bribe-buys-a-contract read the award row's reasons. Estimate, never UNKNOWN. Replace, never layer: the single weighted sum is deleted in the same change. Ranges are not targets (owner, Nov 8).

**Done when.** A second session plays a year (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (named in the test output) and sees a government's award show each member's vote with the reads behind it by record id; changing one member's traits changes their ranking without any weight change. `src/core2/contracts.test.ts` proves it, and the weights are each marked as band limits with a spread in `parameters.json`.

**Waits on.** Nothing.

**Files.** src/core2/modules/contracts.ts, src/core2/data/contracts/parameters.json, src/core2/contracts.test.ts

**Notes.** Found in the post-merge audit of Oct 19 evening. Leave PR #5166 as merged.

Oct 20 (pool feeder): spec written; the 'second read' the block asked for is the firm's earlier-award record from the contracts table plus the member's closeness to the owner, both already in the core, so nothing needs an owner call. Members' views (the stance engine) are not read here because contracts have no policy question; that stays a later addition.

Reviewed Oct 20 (claude, claude/political-game-pool-yucp92-s), not fixed. Four drawn towns, 400 played days each, 106 awards (all with two or more bids): the cheapest bidder won 67, the largest won 72, and the members split between firms in only 11. In the other 95 every member ranked the same firm first. Why: price and workforce are the same for every member and rank the firms the same way whatever the weights' size; only the tie to the owner differs by member, and a member rarely knows a business owner (closeness is zero for strangers), so the officials' traits never change a ranking. The weights are therefore not the problem (a scale on a shared term cannot change who wins); the officials have too little to read. A fix needs a second read per member about each firm that most members hold, for example the member's closeness to the firm's workers, or whether the member or their household bought from it, and a record of which read decided each split. That is a design choice for the Government line (which reads count as the official's knowledge of a firm); build it as a new item once chosen. The cited weights keep their spreads.

Deferred Oct 25: nothing on screen reads it yet. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). A calibration review of who wins a contract bid; no screen or scene shows the weights.
