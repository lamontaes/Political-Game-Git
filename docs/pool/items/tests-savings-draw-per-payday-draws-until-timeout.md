---
id: tests-savings-draw-per-payday-draws-until-timeout
title: "The savings-draw-per-payday test draws places for 670 seconds and fails when none has an employer short on two paydays"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
source: "Account lead F1, Nov 14, 2026, gating #9085 (carries #8886)"
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** `src/core2/results-mode-savings-draw-per-payday.test.ts` proves that a household that draws on savings for a short payday gets one draw per due date. Its second case draws places until one has an employer short on two paydays; with no such place drawn it waits and fails, so the unit job spends its time on a case that is red by draw and a player sees no change either way. Seen: not a player screen; a run of the file shows it.

**Cause.** Measured: on the train head 9c96003b595a3aba4c871e08b314cf443da2b6ed, case 1 (Escalon, California) passes and case 2 ran 670 s, drew places through to Greenville, Delaware (1031430, seed 91b6697c948c054e46949b4f76ea53d0cd58c1cc, world seed 6e1d6f990c6daac964e155367e12c48367ad1404d625c6a2a865ca18a8a8add6) and found none with the case, then failed. The test was not in #8886's diff, so the draw loop is the cause, not that PR. The Nov 14 ruling on pinned cases (pin one place and contest, chosen from built worlds' data, no run-time draw loops) applies.

**Fix.** Build drawn worlds without playing a day, list which have an employer short on two paydays, pin one place and seed from that list, and fail with the place, the seed and the reason if the case does not finish. Keep the first case as it is. Check the case still fails when the one-draw-per-due-date rule is reverted.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** Tests pick their place from data and finish in under about two minutes (skill `drawn-place-tests`). Ask why: the draw cites the employer's pay record by id.

**Done when.** A second session, not the builder, runs the test file on main in a drawn place and a place nobody chose, and both cases pass in under two minutes with the pinned place and seed named in the output, and the case fails when the per-due-date rule is reverted.

**Waits on.** Nothing.

**Files.** src/core2/results-mode-savings-draw-per-payday.test.ts
