---
id: core-household-membership-change
title: "A full person can join, leave or split off a household in the same town, with its lease, bills and cash following"
area: core
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/household-membership
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T16:08:39.277Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Built Oct 17 (claude/household-membership).** `api.changeHouseholdV1({ personIds, householdId, source })` (src/core2/state.ts) moves living full people of one place into an existing household or a new one made at their place, from one or several households. Their share of the household's everyday spending follows by head count (`moveLivingShare`, cost-of-living.ts); the lease they shared is paid by the household they now belong to (`moveHouseholdPayers`, finance-state.ts): a payer who leaves is recorded on the contract, the oldest remaining adult takes over a lease whose payers all left, and one with no one left ends; a joiner is added as a payer. A move that would leave a child in a household with no adult is refused. Cash stays with the person, so no journal entry is needed. A new household has no lease until the housing engine houses it (`houseUnassignedHouseholds`); an owned home is for the caller to sell first (`sellHome`); counted members are not moved by this call (people-partnership-counted). The test is src/core2/household-change.test.ts.
