---
id: health-demoted-test-red-by-draw-malo
title: "health-demoted.test.ts fails on a drawn seed: a demoted person's illness is heard anyway (Malo, Washington)"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: medium
root: none
source: found by the Account lead's gate on the opening-stock branch, Nov 15
claimed-at:
---

**What.** `src/core2/health-demoted.test.ts` fails on one drawn seed and passes on others, on the Train with no opening-stock change in it. `GOLDEN_PATH_SEED=28321f843b9da1ec768bedff7bb45c40 npx vitest run src/core2/health-demoted.test.ts` fails at Malo, Washington (5342310): "person_fe5e0c41d892620d onset: expected 'health.serious-illness:person_fe5e0c4…' to be undefined", the person whose household was returned to the counts the day after being filled in. A random seed passes (Adams, Massachusetts, 36ee1018…) and another fails earlier (Manning, North Dakota, cea29add…: "a filled-in person with an illness booked: expected undefined to be defined"). Seen: a person the game took out of the player's circle, whose illness the counts should carry, shows the health engine beginning that illness.

**Cause.** Needs cause. Measured: the same seed and the same assertion fail with `src/core2/modules/health.ts` from the Train at c43bf7e0, so the change under test is not the cause. The test is drawn (`randomBytes` seed unless GOLDEN_PATH_SEED is set), against the pinned-tests rule, and its premise (a booked illness with an onset more than a day away, heard only after the household returns to the counts) fails at Malo.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the onset comes from the person's strain and line, never a draw. One model, two tiers: a counted person's illness is carried by the same rule as a full person's. Pinned tests: named places, fixed seeds, never loosened.

**Done when.** A second session (not the builder) draws a place from all 56 with a seed it names, runs `health-demoted.test.ts` on it and on the Malo seed above (Malo, Washington, place 5342310, seed 28321f843b9da1ec768bedff7bb45c40), sees each pass, and the PR body names the file and line that heard the onset.

**Waits on.** Nothing.

**Files.** src/core2/health-demoted.test.ts, src/core2/modules/health.ts

**Notes.** TODO
