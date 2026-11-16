---
id: tests-household-quiet-day-not-done-on-opening-days
title: "A household member's quiet day reads not done on the opening days, in the town the draw lands on"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Train thread and lying thread, Nov 15, src/director/household-quiet.test.ts red on ef708196 and on ef708196 plus #9489"
model: sonnet
effort: medium
---

**What.** `src/director/household-quiet.test.ts` picks its place at run time and fails `dayDone: expected false to be true` on the opening days of the played world. It fails at Superior, Arizona (0471300), seed defedab28ded902132c10235d34aeb27d0268f9c, on 2025-01-21 on ef708196 and on the Train before and after #9489 was folded, and at Coeur d'Alene, Idaho (1616750) on 2025-01-23 on ef708196 plus #9489. The town moves with the tree, so it is one red that changes place. Seen: a household member's quiet-day facts say the day is not done on days the quiet scene did happen.

**Cause.** Needs cause. Measured: the same assertion fails at three commits (2a67ea2d, 7de307ca, ef708196), so it does not come from #9489; the first place to look is the test's own place draw and the member's quiet-day record.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet.

**Rules.** Pinned tests: a named place and a fixed seed, never a draw. Ask why: the assertion names the record that says the day is done.

**Done when.** The test passes at a named place with a fixed seed pinned in the file, and a second session sees a household member's quiet day marked done in a drawn place it names with its seed.

**Waits on.** Nothing.

**Files.** src/director/household-quiet.test.ts

**Notes.** Filed by hand by the Train thread, Nov 15, at the lead's request.
