---
id: tests-assistance-work-case-expects-welfare-stops-the-engine-moved
title: "The assistance work requirement case expects stopped heads off the welfare line, which the engine now pays to everyone"
area: laws
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by:
pr: #9282
blocked-on:
source: "asked for by the Account lead on the group B test setup fix, Nov 14"
claimed-at:
after:
lead: account-lead
model: opus
effort: medium
root: rc2-done-from-records
checked: sonnet 2026-11-14
---

**What.** The case `an assistance work requirement stops the welfare benefit for the adults it reaches after its time limit` and the Guam regression case in `src/core2/law-reach-group-b.test.ts` fail on the counted groups' payments: the test expects a rate over only the heads still drawing, the engine pays everyone. Seen: both cases green with their counted-payment assertions meaningful, or the time-limit stop proved where the engine now applies it.

**Cause.** Measured: `GOLDEN_PATH_SEED=417579cd3bdb490fcecb42150921c0f0c56548b72dfcd7c571c7a8e63d2242d6 npx vitest run src/core2/law-reach-group-b.test.ts -t "assistance work requirement stops"` at Bonanza GA (place 1309272): 64 heads, 5 stopped by the test's count; the engine pays 1570 a household, which is delta times share over twelve over all 64 heads, while the test's rate is 1703 over 59 (counted total 97,340 against 97,071). Same shape at Inarajan GU, seed 741e1fe731e2aef3a39de315f1d07c4368754d2d0409b3bbeacc39f43896b2b6 (1,882,970 against 1,876,871) and Vashon WA, seed 0123 (98,648 against 98,084). Found in code: `payBenefits` in `src/core2/law-reach/group-b-money.ts` says this is cash assistance from a budget amendment, not SNAP, and only the food-aid engine applies the SNAP month limit, so `drawing = input.heads` includes everyone; the test still expects the welfare line to stop after the time limit. At the drawn Northern Mariana place, seed bfd059855410cc31f890ce53854520bd0b9a916bda7c090436ff27f39bfc819a, all 45 heads are counted and none draws a named month, so `nobody reached the time limit` fails there for the same reason.

**Fix.** Design: read the Oct 2026 rulings and the food-aid engine to see whether the welfare line should carry the time limit (then wire `timeLimitedNow` back into `payBenefits`) or not (then move the stop assertions to `group-b-food-aid.test.ts` and make this case prove the full payment to every head, with the rate over all heads). Do not loosen the sums.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** Wire to the world: the fix goes through the engines a played world uses and a case that fails for its own reason stays failing until fixed, never loosened or skipped; one rule, all 56 places: the cases keep drawing places and name each place and seed.

**Done when.** A second session, not the builder, runs `npx vitest run src/core2/law-reach-group-b.test.ts` on main in a drawn place and seed it names (buildBenchWorld not needed, the test builds the world) and sees the named cases pass with their assertions unchanged, with the record ids each case writes named.

**Waits on.** The group B setup fix folding.

**Files.** src/core2/law-reach-group-b.test.ts; src/core2/law-reach/group-b-money.ts

**Notes.** Found while fixing tests-law-reach-group-b-fails-in-setup.
