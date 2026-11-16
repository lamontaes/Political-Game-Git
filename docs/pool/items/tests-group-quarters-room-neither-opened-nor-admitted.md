---
id: tests-group-quarters-room-neither-opened-nor-admitted
title: "group-quarters test: a group-quarters home appears in the played year that was neither in the opening nor admitted, red on the Train and on main by draw"
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
source: views thread, Nov 16 (gate of the main-into-Train merge)
---

**What.** src/core2/group-quarters.test.ts checks that every household with group quarters at the year's end either opened that way or was admitted from an institution's waiting list. At some draws it finds a group-quarters home that is neither, so a room appears during the year with no admission record behind it. The test draws its seed with randomBytes at run time, so whether it fails depends on the draw.
Seen: Storrs, Connecticut (0973980), seed 085af212ffbc1c6c40eb8b1d4c7b8799395ba939, fails on household_74dea9d3bd682774 the same way on a clean checkout of the Train head a62a2fdad884ccd1313d1e1436088fe05986d49b and on the main-into-Train merge. With that seed, main 4387b61a32b47a664efe6212b50b5dd53491b9fb fails the same check in its drawn place 4419180 on household_60677f3bcb5bea7a. Replay with `GOLDEN_PATH_SEED=<seed> npx vitest run src/core2/group-quarters.test.ts`.

**Cause.** Needs cause. Looked at: the replays named under Seen. The same seed and household fail on the clean Train, so the merge did not cause it.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** One rule, all 56 places: the test names its places and seeds, found once by script, never drawn at run time.

**Done when.** The Storrs seed above passes, the test names its places and seeds, and a second session replays it on the Train and sees all four cases pass, then plays a drawn place (place and seed named) and sees no group-quarters home without an opening or admission record.

**Waits on.** Nothing.

**Files.** src/core2/group-quarters.test.ts

**Notes.**

- Nov 16, views thread: main alone at a fresh draw (Marietta, Georgia, 1349756, seed 1780ee07a861b8eca8b4e3a5a2ef45df1b43c9d3) failed a different check, "household_4c215653074df8dc: expected undefined to be 'group'". The Train at a fresh draw passed all four cases.
