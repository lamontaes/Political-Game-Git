---
id: speed-leadership-membership-kept-per-chamber
title: "One chamber reorganizing makes every other chamber rebuild its member list the same day"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: opus
effort: medium
root: none
source: Red main, Nov 24, 2026, from Elections' line on #10377 (comment 7125944315): leadership-membership-kept.test.ts at place 5401396, GOLDEN_PATH_SEED=e2642f1d0b95cadc, expected 195 to be at most 108
checked:
---

**What.** A chamber's member list is kept for the day and rebuilt only when what it reads has changed (`knownSignature`, `membershipReads`, `src/core2/modules/leadership.ts` ~400 to 430). The change is detected from the whole-module write counters of the offices, officials and voting engines. At place 5401396 (seed e2642f1d0b95cadc) with 108 state chambers, the first day's lookups rebuilt 195 member lists, 87 more than the one a chamber should need. The probe showed two chambers whose own seats changed that day (so they really reorganized), each bumping the offices and officials counters by one, and every chamber already read that day found its kept list stale and rebuilt it: 86 lists whose members had not changed, rebuilt for no reason (US-AK lower and upper, US-AL lower and upper, and on through US-CA).

**Cause.** Found in code: `membershipReads` stores one write count per whole module (`core2-offices-v1`, `core2-officials-v1`), not per chamber, so one chamber's seat change invalidates every other chamber's kept signature. The test's bound (rebuilds at most the number of chambers) holds only on days when no chamber's membership changes.

**Fix.** Key each kept list to what its own chamber's member list reads (that chamber's seats and their holders: the offices table rows of the chamber and the officials' terms on them), not the module's whole write count, so a seat change in one chamber leaves the others' kept lists standing. Where that is not possible, keep the whole-module counters and count only a rebuild that changes the signature. The test's bound stays: no change to it.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** Speed: never scan the whole world or history every day; no change may make a year more than 20 percent slower. No dice.

**Done when.** At place 5401396, seed e2642f1d0b95cadc, `src/core2/leadership-membership-kept.test.ts` passes unchanged (replay with GOLDEN_PATH_SEED, which the test now reads), and on a day when two chambers reorganize the other chambers' rebuild count stays at one. A second session sees nothing change for a player.

**Files.** src/core2/modules/leadership.ts, src/core2/leadership-membership-kept.test.ts

**Notes.** Found by Red main. The test reads a random seed, so it fails by draw on a day some chamber reorganizes; the cause is not the test.
