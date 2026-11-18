---
id: tests-pin-census-scale-closures
title: "Pin the Census-size closings test to named places and seeds"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: money
model: sonnet
effort: medium
root: none
source: "layoffs-read-law-costs thread, Nov 16"
claimed-at:
---

**What.** The Census-size closings test draws its place and seed at run time, so it passes or fails by the draw. On PR 9629 it failed once on a draw nobody recorded and passed on the rerun. Pin it to named places and seeds found by a script outside the test.
Seen: the rerun drew Bayshore Gardens, Florida (1204350), seed 084f1a5ade579f6a8b4de9503d4e28fe959fc7dd3c1f9c24e83899b8f610650b, and passed in 471 seconds.

Seen also: at GOLDEN_PATH_SEED=cash1 the test drew New London, Connecticut and failed on train3 a2cbd213 itself (38 closings against a bound of 21), so the red is the draw, not a branch (found on #9717, Nov 16).

**Cause.** Measured: at Bayshore Gardens, Florida, seed 084f1a5ade579f6a8b4de9503d4e28fe959fc7dd3c1f9c24e83899b8f610650b, by `npx vitest run src/core2/census-scale-closures.test.ts`; the file draws with randomBytes and drawPlace at line 19 to 28, and a first run on the same head failed on an unrecorded draw.

**Fix.** Replace the run-time draw in src/core2/census-scale-closures.test.ts with two named places and fixed seeds over 10,000 people where firms close in the year, picked by a script outside the test capped at one hour, and bring the run near a minute where it can be. The player sees it nowhere; it guards that a Census-size town closes no more businesses than the sample town, which the player sees in the paper.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a test pinned to a place and seed is never red by the luck of a draw.

**Done when.** A second session runs the pinned test twice in the drawn place the test names (each pinned place) and sees it pass both times with closings above zero in each.

**Waits on.** Nothing.

**Files.** src/core2/census-scale-closures.test.ts
