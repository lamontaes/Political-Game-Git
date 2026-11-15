---
id: tests-counted-moves-causes-minors-alone-search
title: "counted-moves-causes searches up to 60 drawn places for a household of minors alone, takes about an hour, and is red when none is drawn"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: none
source: Account lead T28, Nov 14 (found while checking #9057)
claimed-at:
checked:
branch:
---

**What.** The test case "a counted household of minors alone records its group's rate" builds up to 60 drawn worlds looking for one that holds a counted household with no adult, plays a year in each that has one, and fails when none of its draws has such a household that moved. It runs about an hour and is red by draw, so it hides real failures in the rule it guards. Guards: the town's people count on the Metrics tab, through the rule that every counted move names the rate that weighed it.

**Cause.** Measured: run `GOLDEN_PATH_SEED=t28causes01 npx vitest run src/core2/counted-moves-causes.test.ts -t "a counted household of minors alone"`; on the train at eb349e5d, src/core2/counted-moves-causes.test.ts -t "a counted household of minors alone" ran 3,453 s and failed: "no drawn place in 60 had a counted household of minors alone that moved" (first passed over: Shoreham, Michigan, 2673660, seed b1c07198735c8f39d1a0e1c5f0cec7c0d28d3b67ead1124485a719177ef8e96b; Slater, Wyoming, 5671295, seed 9110f527c504f668292fdfc04df7aac8c56a226f6f799a54d7ed17e4e6876118). On #9057's branch the same case had not finished at 4,000 s. Such households are rare in an opening world, and the test only finds one by drawing whole worlds.

**Fix.** Find the case from the world's records, not by drawing: build one drawn world, pick a counted household with adults and children from its own records, and test `reasonsFor`'s group-rate path on a household of its minors alone made by the existing residents functions (or the departure path's own unit), so one world and one month prove it. Name the place, seed and record ids in the message.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** A test never searches by draw for a rare case and never fails by the luck of a draw (`drawn-place-tests`); no dice.

**Done when.** A second session runs the case with three fresh seeds and sees it pass in each drawn place in under two minutes, naming the place, seed and the household record id it used.

**Waits on.** Nothing.

**Files.** src/core2/counted-moves-causes.test.ts

**Notes.** Filed by Account lead T28 on branch claude/project-thread-ojvmv1.
