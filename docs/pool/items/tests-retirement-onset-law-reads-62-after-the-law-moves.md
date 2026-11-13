---
id: tests-retirement-onset-law-reads-62-after-the-law-moves
title: "The retirement-onset test reads 62 the day after the earliest claim age moves to 65"
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
lead: m0-m2
model: sonnet
effort: medium
root: none
source: found by opus-5234 on Nov 11, 2026, while wiring the Social Security age laws (item wire-law-links-to-people-part-1-partly-wired-laws)
---

**What.** src/core2/retirement-onset-law.test.ts fails on main: after the test's mock of `socialSecurityAges` raises the earliest claim age to 65 and the world advances one day, `retirementOnsetYears` (src/core2/modules/jobs.ts line 3819) still returns 62 ("expected 62 to be 65", test line 52). Seen in Cottontown, Tennessee (4717420), run seed f3a0185fb36f1b72 (RETIRE_ONSET_SEED=f3a0185fb36f1b72), on main 3a9e824dddb, and in Bethlehem, North Carolina (3705530), run seed 31514229e28a0c71. Seen: the test passes in a drawn place.

**Cause.** Needs cause. Looked at: `retirementOnsetYears` caches its answer per world by `api.state.date` (`onsetToday`), and reads `socialSecurityAges` from modules/laws.ts, which the test mocks. Not traced: whether the one-day `advanceCore` call moves `core.date` in a world built by `buildBenchWorld` at the game's start, or whether the mock reaches the jobs engine's import.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never weaken a test: the test's claim (the jobs engine reads the law in force the next day) stays. One rule, all 56 places: the place is drawn and named with its seed.

**Done when.** `RETIRE_ONSET_SEED=f3a0185fb36f1b72 npx vitest run src/core2/retirement-onset-law.test.ts` passes, and the test passes in two more drawn places named with their seeds; then a second session turns dev mode on in the running game in a drawn place, passes a federal bill raising the earliest claim age to 65, runs past its effective date, and sees in Trace that the jobs engine's retiring decisions for workers aged 62 to 64 in that town read the onset as 65.

**Waits on.** Nothing.

**Files.** src/core2/retirement-onset-law.test.ts, src/core2/modules/jobs.ts
