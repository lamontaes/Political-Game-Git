---
id: world-new-homes-finish
title: "Finish #4347: households occupy new rentals, with the rent cap read"
area: world
kind: wiring
priority: 1
status: done
claimed-by: claude/world-new-homes-finish
pr: #4506
blocked-on:
milestone:
source: "reissue item 4; PR #4347 branch world/session-b-new-homes"
claimed-at: 2026-10-15T22:37:08.428Z
---

**What.** The new-homes pull request moved rental renewal into housing-occupancy.ts renewRentalLeases, but main's housing.ts renew became renewRents with the rent-stabilization cap read, so renewals on the branch ignore the cap. Merge main, port the cap read (or call renewRents), keep housing-laws.test.ts passing, and give the moves table a reader in play (the director's ledger or the news). A player would notice a rent-stabilized rental not jumping past the cap when a new household moves in.

**Rules.** An effect is a read, not a record: the moves table counts only once the news or the director's ledger reads it. Replace, never layer: one renewal path remains, not renew and renewRentalLeases side by side. Wire to the world: the cap changes a rent a named tenant pays. One rule, all 56 places: the cap comes from each place's law data.

**Done when.** The branch merged with main (plain merge, never force) and the test in src/core2/housing-laws.test.ts passes. In a one-year played world (buildBenchWorld, a drawn place from all 56 with rent stabilization, seed named) a lease renewal record id is capped, and a move record id appears in the news or director ledger. The owner plays it: a new family moves into a new rental and a stabilized renter's rent stays capped.

**Files.** src/core2/modules/housing.ts, src/core2/housing-construction.ts, src/core2/housing-laws.test.ts, src/core2/data/stopgaps.json

**Notes.** None.
Sent back 2026-10-15 from PR #4347 (branch world/session-b-new-homes): code conflict with main in src/core2/modules/housing.ts, stopgaps.json; finish on that branch, merge main into it first. (PR references as of 2026-10-15.)
