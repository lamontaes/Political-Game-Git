---
id: tests-counted-moves-town-tiny-town-red
title: "counted-moves-town.test.ts is red by draw where the town's unknown groups hold too few people for a household to leave in 150 days"
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
effort: low
root: none
source: Account lead T28, Nov 13 (found while checking #9057)
claimed-at:
checked:
branch:
---

**What.** The test that the governing town's own counted households leave fails by draw, on the train before #9057 and after it. A red by draw hides real failures. Guards: the town's people count on the Metrics tab, through the rule that the town's own counted households leave.

**Cause.** Measured: Delphos, Iowa (1919810), world seed 06c297cea5cea2e1be55278442ed8892f1c2d74e4bf151b37a2d7007583c1002: the groups the place lookup does not know hold 7 groups and 20 people; after 150 days and after 365 days no household of them has left, on the train at eb349e5d and on #9057 alike. At about 5 percent a year, 20 people are due about 0.4 of a person in 150 days, under half a household, so nothing is due to leave. The test asserts at least one departure in the first drawn place that has such groups, whatever its size.

**Fix.** In src/core2/counted-moves-town.test.ts, pass over a drawn place whose unknown groups are due less than one household in the window (people times the ACS rate times 150/365 under its largest household), name each place passed over, and keep drawing up to DRAWS.

**Time box.** 1 hour for one Sonnet session.

**Rules.** Never tune a seed; the test names every place it passes over (`drawn-place-tests`).

**Done when.** A second session runs the test with the seed that drew Delphos and with three fresh seeds, sees it pass in each drawn place, and sees the places passed over named with their place and seed.

**Waits on.** Nothing.

**Files.** src/core2/counted-moves-town.test.ts

**Notes.** Filed by Account lead T28 on branch claude/project-thread-ojvmv1.
