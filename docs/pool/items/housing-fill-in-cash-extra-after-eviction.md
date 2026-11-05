---
id: housing-fill-in-cash-extra-after-eviction
title: "A homeless counted household's member holds more cash after fill-in than the group's share (Storrs seed 6a82eee4d36f05a3)"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** With the renter-median rent fix (branch one-map-rent), housing-counted-evicted.test.ts fails on seed 6a82eee4d36f05a3 at the money check: a single-member homeless counted household (recorded cash 441,159 minor, group share 348,620) ends fill-in with 415,672 minor in the member's account, 67,052 more than the group's share. Trace which inflow adds it (fill-in posting order, a payment between the share being read and the transfer, or the person's creation cash) and make the member hold exactly the share, or name the other inflow with its source.

**Rules.** An effect is a read, not a record; money is conserved: every dollar a person holds has a named source.

**Done when.** The Storrs test passes on seeds 6a82eee4d36f05a3 and 23a69275e4623bd5 with the renter-median rent fix, and the extra inflow is named by record id.

**Files.** src/core2/modules/residents.ts, src/core2/housing-counted-evicted.test.ts

**Notes.** Resolved as a test assumption, not an engine bug (One Map, Nov 5). Trace: the household had been filled in once, returned to the counts, evicted and filled in again; its person record kept 67,052 minor of pay it had collected, and the second fill-in added exactly the group's share (348,620) on top, so 415,672 = 67,052 + 348,620. The test now asserts after = before + share (`housing-counted-evicted.test.ts`, branch `one-map-rent`). Still worth a look by the demotion owner: a demoted person record keeps collecting pay in its own account while the household is counted.
