---
id: core-household-membership-change
title: "A full person can join, leave or split off a household in the same town, with its lease, bills and cash following"
area: core
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/household-membership
pr: #4948
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T16:08:39.277Z
---

**What.** There is no core call that moves a full person between households in the same town. `relocatePeopleV1` (src/core2/types.ts, state.ts) moves people to another place and may start a new household there, but nobody can join an existing household, leave one for a new dwelling in town, or split a household in two, and a household's money, lease and bills do not follow. Add one call for all three: the person's `householdId` and both households' `memberIds` change together; a household's living-cost payer (`livingPayerOf`), its lease or mortgage record (housing `leases` and `dwellings`), its finance contracts and each member's cash stay consistent; an emptied household ends its lease. It posts a journal record for any money moved and emits an event the engines and the director can read.

**Rules.** One model, two tiers: the call works for a full person and a household that contains counted members (the counted-groups store keeps them; see core-counted-views-delete). Every dollar balances. Replace, never layer: no engine keeps its own copy of who lives where. Core change: this area owns it.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) a test moves a named adult out of one household into a new lease and another into an existing household, and shows by record id the memberIds, the lease, the bills' payer and the cash before and after, with the journal balanced. A test in src/core2 names the place and seed.

**Files.** src/core2/state.ts, src/core2/types.ts, src/core2/modules/housing.ts, src/core2/modules/residents.ts

**Notes.** First part of people-partnerships-form-and-end, which was split on Oct 17 (claude). Read how moves.ts relocates people and how housing.ts occupies a rental (`occupyCompletedRentals`, `houseUnassignedHouseholds`) before writing it.
