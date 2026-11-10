---
id: housing-fill-in-cash-extra-after-eviction
title: "A homeless counted household's member holds more cash after fill-in than the group's share (Storrs seed 6a82eee4d36f05a3)"
area: world
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** With the renter-median rent fix (branch one-map-rent), housing-counted-evicted.test.ts fails on seed 6a82eee4d36f05a3 at the money check: a single-member homeless counted household (recorded cash 441,159 minor, group share 348,620) ends fill-in with 415,672 minor in the member's account, 67,052 more than the group's share. Trace which inflow adds it (fill-in posting order, a payment between the share being read and the transfer, or the person's creation cash) and make the member hold exactly the share, or name the other inflow with its source. The group's share is what the counted household held when it was filled in, so any extra cash has to come from a named source.

**Rules.** An effect is a read, not a record; money is conserved: every dollar a person holds has a named source.

**Done when.** The Storrs test passes on seeds 6a82eee4d36f05a3 and 23a69275e4623bd5 with the renter-median rent fix, and the extra inflow is named by record id. The test asserts that the member's cash after fill-in equals the cash before plus the group's share, and the PR names the extra inflow by record id.

**Files.** src/core2/modules/residents.ts, src/core2/housing-counted-evicted.test.ts

**Notes.** Resolved as a test assumption, not an engine bug (One Map, Nov 5). Trace: the household had been filled in once, returned to the counts, evicted and filled in again; its person record kept 67,052 minor of pay it had collected, and the second fill-in added exactly the group's share (348,620) on top, so 415,672 = 67,052 + 348,620. The test now asserts after = before + share (`housing-counted-evicted.test.ts`, branch `one-map-rent`). Still worth a look by the demotion owner: a demoted person record keeps collecting pay in its own account while the household is counted.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. The extra cash was a test assumption, not an engine bug (the item's own Notes trace it: a person record that had collected pay of its own kept it, and the second fill-in added the group's share on top, so 415,672 = 67,052 + 348,620). src/core2/housing-counted-evicted.test.ts now asserts after = before + share (comment near line 513, "fill-in adds the share"). The residual, that a demoted person record keeps collecting pay in its own account while the household is counted, is a note for the demotion owner and has no cause of its own to fix.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): already done on main (evidence in the Notes above).
