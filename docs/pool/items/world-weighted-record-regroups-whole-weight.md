---
id: world-weighted-record-regroups-whole-weight
title: "One counted household's change moves all the households it stands for into another group"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: world
model: opus
effort: medium
root: none
source: Red main, Nov 24, 2026, from school-voucher-law at seed 4db396ca79500667 (#10371)
checked:
---

**What.** A counted household record stands for many households (its weight). When anything about the one record changes its group key, the whole record moves with its whole weight in one regroup, so a group can triple in a day. At Virginia Beach, Virginia (seed 4db396ca79500667), group 138 held 140 people (one record, 3 members, weight 46.67) until Feb 28 and 420 on Mar 1 to 3, when a second record (6 members, weight 46.67, so 280 people) joined it, its kind changing from `adults` to `with-children`. Every engine that reads the group by its people (a voucher record's count, a law's reach, the town's shares) sees the jump. Seen: the school voucher record counts 140 people for a group that holds 420 two days later, and a group's share of a law's dollars triples at a month's start.

**Cause.** Found in code: `groupKeyOf` and `regroupHousehold` in `src/core2/modules/residents.ts` (~455 to 530) key the record to one group by `kind: children > 0 ? "with-children" : ...`, a threshold on the one representative record, then `CountedStore.regroup` in `src/core2/counted-groups.ts` (~839) moves the whole record. Why that record's kind changed on Mar 1 (a child added to its members) is not traced.

**Fix.** Read why the record's kind changed on Mar 1 at that seed. Then make the move of a weighted record follow its members' change by their share: a change in one of the households a record stands for moves that household's share of the weight (`releaseWeight` in `counted-groups.ts` already splits one household off a record), not the record's whole weight, so no group changes by more than one household's people in a day. No cap and no tuned number.

**Time box.** 4 hours, Opus.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count); sliding scales, nothing flips at a threshold; wire to the world.

**Done when.** At seed 4db396ca79500667 and two other drawn places, no counted group's people change by more than one household's share in a day over 60 days of a played world, and `src/core2/school-voucher-law.test.ts` (after #10371's timing fix) passes its size check unchanged. A second session sees a voucher's recorded people match the group's size on the days around a month's start.

**Waits on.** #10371 for the voucher test's timing fix.

**Files.** src/core2/modules/residents.ts, src/core2/counted-groups.ts, src/core2/school-voucher-law.test.ts

**Notes.** Found by Red main while tracing the voucher test's second assertion; the test's size check is left strict on purpose.
