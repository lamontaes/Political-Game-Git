---
id: world-new-homes-finish
title: "Finish #4347: households occupy new rentals, with the rent cap read"
area: world
kind: wiring
priority: 1
status: in-pr
claimed-by:
pr: #4347
blocked-on:
milestone:
source: "reissue item 4; PR #4347 branch world/session-b-new-homes"
---

**What.** Merge main; housing.ts renew() became renewRents with the rent-stabilization cap read (#4331) and this PR moved renewal to housing-occupancy.ts renewRentalLeases without that read. Port the cap read (or call renewRents), keep housing-laws.test.ts passing, and give the moves table a reader in play (the director's ledger or the news).

**Rules.** Merge main into the PR branch (plain merge, never force); a release declaration in docs/release/changes/. An effect is a read.

**Done when.** housing-laws.test.ts passes; a move shows in the news or director ledger in a drawn year, by record id.

**Files.** src/core2/modules/housing.ts, housing-occupancy.ts

**Notes.** None.
