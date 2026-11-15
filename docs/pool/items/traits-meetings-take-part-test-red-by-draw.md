---
id: traits-meetings-take-part-test-red-by-draw
title: "The meetings take-part calibration test is red on some fresh draws because its band is narrower than the pooled spread it was fitted on"
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
lead: effects
model: opus
effort: medium
root: none
source: filed by hand by the meetings and floor builder from the Account lead's ask, Nov 15 2026
checked: meetings and floor builder 2026-11-15
---

**What.** `src/core2/modules/meetings.traits.test.ts` draws a fresh pair of towns every run, so it passes on some draws and fails on others on the same code. A red by draw hides real reds and costs a pull request a long run to disprove. The premise it was written on, in its own comment: the weight was fitted on twenty drawn towns whose pools read 0.52 to 2.04 singly, four runs of two towns pooled read 0.84 to 1.57, and the pass band is half to twice the study's 1.088. Seen: on the train aa927a84 and on the base before it, seed 0f1e2d3c4b5a69788796a5b4c3d2e1f001122334 draws Lakewood Shores, Illinois and Mount Hope, Wisconsin and reads 2.556 pooled against an upper bound of 2.177, while seed a1b2c3d4e5f60718293a4b5c6d7e8f9012345678 passes.

**Cause.** Measured: the pooled read on Lakewood Shores, Illinois (seed 0f1e2d3c…2334:meetings:3) is 3.78 alone and Mount Hope, Wisconsin (:6) is 1.87, so two towns pooled can sit above twice the study; the fit's own spread (0.52 to 2.04 singly) is wider than the band the test asks of a pool of two. Not yet found: whether the 3.78 comes from a room that fills from few residents (the Antelope Hills and Whitney pattern in traits-meetings-take-part-spread-across-towns, dropped Nov 10) or from saturated feeling.

**Fix.** Pin the test the way pinned-tests says: two named towns with fixed seeds, each read once, so the test is never red by draw, with the weight refit if the pinned pair reads outside the band. Do not widen the band or re-pin without the Account lead's yes and the old premise stated in the pull request.

**Time box.** 4 hours.

**Rules.** No dice; one rule for every place; pinned tests; no new stopgaps.

**Done when.** A second session runs the test three times in a row on the pinned towns and it reads the same number and passes each time, naming the two drawn places and their seeds (Lakewood Shores, Illinois and Mount Hope, Wisconsin are the pair that read high); the pull request states the old premise.

**Waits on.** Nothing.

**Files.** src/core2/modules/meetings.traits.test.ts, src/core2/trait-test-kit.ts

**Notes.** Found while checking the town hall question change (meetings-town-hall-question-is-one-the-seat-decides): on both seeds mine matches the base to the digit, so the red is the draw's.
