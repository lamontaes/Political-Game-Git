---
id: tests-housing-family-test-has-no-pinned-place
title: "The housing family test cannot finish: it draws and plays up to 14 worlds, and its gate counts people, not renters"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: found by fixer F6 while proving tests-housing-apartment-gate-too-narrow (Nov 14)
after:
lead: laws-effects
model: sonnet
effort: medium
root: none
---

**What.** `src/core2/law-wiring-housing.test.ts` builds its played world in one `beforeAll` that draws places and plays 700 days in each until one has a subject, up to 14 builds. Every one of its 13 cases then reads that one world, and the cases themselves take milliseconds. The file never finishes on a normal run (over 30 minutes with no output; earlier builders saw 28, 50 and 100 minutes). Seen: nowhere in play; it guards the housing laws' wiring test.

**Cause.** Measured: with `GOLDEN_PATH_PLACE_KEY=3455620` (Packanack Lake, New Jersey, 6,321 people, which passes the apartment gate) and `GOLDEN_PATH_WORLD_SEED=f6-seed-1`, all 14 attempts ended "no subject: 110 renters, 1 landlords" and the file took 350 s (about 25 s a build), then all 13 cases failed. The gate in `apartmentsPermitted` and the `people < MIN_RENTERS` check count the town's people, not its renters or landlords, so a place can pass the gate and still have no subject. With the pin set, the same place is rebuilt 14 times. At Azalea Park, Florida (1202850, 16,180 people, same seed) the run did not finish in 1,500 s.

**Measured, pinned runs (Nov 14, fixer F6, one pin at a time, the test's own 700 days).** Gate figures at day 1 (renters, landlords) passed at 14 of 14 places scanned in 14 states, so the gate cannot choose a pin. Playing the 700 days at each pin took: Southern Pines NC (3763120, 17,357 people, 3,330 renters) 504 s; Fort Carson CO (0827370, 18,019 people) 584 s; Whitney NV (3283800, 47,221 people) 601 s; La Porte TX (4841440, 37,983 people) over 600 s (the hook timed out at 600 s with three runs sharing the machine). Southern Pines, Fort Carson and Whitney all ended "no subject: no apartment building was started while the by-right law stood (in force on 24 of 24 monthly checks)", although the permit-rate estimate says 76, 68 and 125 apartments. A pin therefore needs a measured start of an apartment building under the law, not the day-one gate, and one pin costs about ten minutes, not one. Seed `housing-pin-1`.

**Fix.** Pin one place and world seed per case from data (a place whose built world has enough renters and landlords), drop the draw loop, and fail with the place, seed and reason when a case has no subject. Each case runs in about two minutes.

**Time box.** 3 hours.

**Rules.** No dice: pins are chosen from built worlds' records. One rule, all 56 places: the pins are three named places in three states, none Washington, D.C.

**Done when.** The family test finishes in under 10 minutes per pinned place on three pinned places, each a drawn place named with its seed, and each case passes. A second session sees it in the running game: it runs the file on main and reads each place and seed in the output.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-housing.test.ts
