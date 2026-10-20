---
id: core-household-membership-change
title: "A full person can join, leave or split off a household in the same town, with its lease, bills and cash following"
area: core
kind: feature
priority: 2
size: M
status: in-pr
claimed-by:
pr: #4948
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Built Oct 17 (claude/household-membership).** `api.changeHouseholdV1({ personIds, householdId, source })` (src/core2/state.ts) moves living full people of one place into an existing household or a new one made at their place, from one or several households. Their share of the household's everyday spending follows by head count (`moveLivingShare`, cost-of-living.ts); the lease they shared is paid by the household they now belong to (`moveHouseholdPayers`, finance-state.ts): a payer who leaves is recorded on the contract, the oldest remaining adult takes over a lease whose payers all left, and one with no one left ends; a joiner is added as a payer. A move that would leave a child in a household with no adult is refused. Cash stays with the person, so no journal entry is needed. A new household has no lease until the housing engine houses it (`houseUnassignedHouseholds`); an owned home is for the caller to sell first (`sellHome`); counted members are not moved by this call (people-partnership-counted). The test is src/core2/household-change.test.ts.

Sent back 2026-10-17 from PR #4948 (branch claude/household-membership): Morning check: the new household-change.test.ts can pass without exercising two of the three API operations: splitting into a new household is inside if (third), and emptying a household/ending its lease is inside if (lone). Require or separately draw eligible worlds for each case with bounded retries, and fail if any case is not exercised. After advancing forty days, rerun the payer/membership invariant as well; it is currently called only before the advance.; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4948 (branch claude/household-membership): Merging current main (6d06ba1622) conflicts in docs/pool/items/core-household-membership-change.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.
