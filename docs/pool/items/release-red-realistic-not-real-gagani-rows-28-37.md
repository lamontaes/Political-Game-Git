---
id: release-red-realistic-not-real-gagani-rows-28-37
title: "At Gagani, Northern Mariana Islands, the town's population and the schools people went to open on their published values"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: money
model: sonnet
effort: medium
source: "found by the lying thread on #9534's guards job (head c5f817e5), Nov 15, passed to T54; filed by T54 when pinning realistic-not-real (tests-housing-sale-tests-draw-from-the-clock)"
---

**What.** `src/core2/realistic-not-real.test.ts` fails at Gagani, Northern Mariana Islands (territory:MP:gagani) with `REALISTIC_SEED=82a3ae5b7c14185a` on audit rows 28 (the town's population) and 37 (the schools people went to). The rule says a fixed statistic must differ between two worlds and from its published row. These two do not, at that place. It was seen on #9534's guards job at head c5f817e5, and the same on f6a552b3 (Train c43bf7e0 plus the lying change): 2 failed, 15 passed. The test is now pinned at Porter, Oklahoma, so this place no longer runs in it. Seen: dev mode's metrics for Gagani show the published population and schools, the same in every world.

**Cause.** Needs cause. Not traced: Gagani is a small island place, and both rows may open on the published value because the place's counts are too small to spread. First step: at that seed, build the two worlds and read row 28's population and row 37's school records against the published row, and say whether the spread rule collapses for a small place or the island path skips it.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, write what was read here and stop.

**Rules.** Realistic, not real (owner, Oct 27). One rule, all 56 places. Never loosen the guard to get green.

**Done when.** A test pinned at Gagani with that seed shows rows 28 and 37 differing between two worlds and from the published row. A second session, at a drawn island place it names with its seed, sees in dev mode a population and a schools list that are this world's own.

**Waits on.** Nothing.

**Files.** src/core2/realistic-not-real.test.ts
