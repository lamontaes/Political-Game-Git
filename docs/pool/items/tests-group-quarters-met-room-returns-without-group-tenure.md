---
id: tests-group-quarters-met-room-returns-without-group-tenure
title: "group-quarters test: a group-quarters room met on day one returns to the counts with no tenure, not as a group room"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-one-model-two-tiers
lead: renters
model: sonnet
effort: medium
source: views thread, Nov 16 (pinning the group-quarters test)
---

**What.** src/core2/group-quarters.test.ts meets a group-quarters room on day one. When that room has returned to the counts by the year's end, the test checks that its household keeps tenure "group" and its quarters type. At some places the household comes back with no tenure at all. The player would see a nursing-home or dorm room filled in on day one become an ordinary counted household with no housing tenure.
Seen: Holden, West Virginia (5437948), the test's drawn place at seed pin-gq-0, on the Train a62a2fdad884ccd1313d1e1436088fe05986d49b: "household_dbc7dd124856b6e9: expected undefined to be 'group'" at the tenure check. Main 4387b61a32b47a664efe6212b50b5dd53491b9fb fails the same way at Marietta, Georgia (1349756), seed 1780ee07a861b8eca8b4e3a5a2ef45df1b43c9d3, on household_4c215653074df8dc.

**Cause.** Needs cause. Looked at: the two runs named under Seen. The fault is not the one in tests-group-quarters-room-neither-opened-nor-admitted, which fails a later check.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** One model, two tiers: a room filled in and returned to the counts keeps the same tenure and type a counted room has.

**Done when.** The Holden case in the pinned test passes, and a second session replays the test on the Train and in a drawn place (place and seed named) and sees every met room return with tenure "group".

**Waits on.** Nothing.

**Files.** src/core2/group-quarters.test.ts

**Notes.**

- Nov 16, views thread: kept in the pinned test as a red case.
