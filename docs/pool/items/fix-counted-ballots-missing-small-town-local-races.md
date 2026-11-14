---
id: fix-counted-ballots-missing-small-town-local-races
title: "Give counted voters ballot records in small towns' local races"
area: gov
lead: governing
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead, Nov 14, golden-path M0-13 red on #9145 and on the clean train
claimed-at:
standard: 2
model: opus
effort: medium
root: design-one-model-two-tiers
---

**What.** In a small town, the council and mayor races are decided with no ballot from the town's counted population, so the people the player never meets do not vote in the town's own elections. The player sees it on the election results: a race decided with no counted votes behind it.

**Cause.** Measured: golden-path M0-13 (`GOLDEN_PATH_PLACE_KEY=4645100`, New Witten, South Dakota; `GOLDEN_PATH_SEED=739e4c650d9f998a4d6dd093221ef287bd597cd4438ae642842c2284acc60d53`, mode long) fails "counted voters vote in local races": 3 of 3 local races decided in the run (Council member, Council member, Mayor) have no counted ballot record although the town has 22 counted adults. It fails the same way on the clean train head 03ca9cbb3d and on #9145's head 5ce23f2665, and the town has no prison, so the group-quarters change is not the cause. Which step skips the counted ballots (the counted scale, the turnout inputs or the race's ballot writer) is not yet found; the first step is to find it.

**Fix.** Find the step that leaves the town's counted adults out of the local race's ballots and make it read them by the same rule as full voters times their count; add a pinned test at this place and seed.

**Time box.** 4 hours for one opus session.

**Rules.** One model, two tiers. No dice. Pinned place and seed in the test; not red by draw.

**Done when.** Golden-path M0-13 passes at place 4645100 with the seed above, and the town's three decided local races each show counted ballot records by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, tests/golden-path/played-world.node-test.ts

**Notes.** Found while checking the red on #9145. Filed by hand.
