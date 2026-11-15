---
id: tests-retirement-onset-law-reads-62-after-the-law-moves
title: "The retirement-onset test reads 62 the day after the earliest claim age moves to 65"
area: core
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/fable-b-retirement-onset-test
pr: #9468
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: none
source: found by opus-5234 on Nov 11, 2026, while wiring the Social Security age laws (item wire-law-links-to-people-part-1-partly-wired-laws)
---

**What.** src/core2/retirement-onset-law.test.ts fails on main: after the test's mock of `socialSecurityAges` raises the earliest claim age to 65 and the world advances one day, `retirementOnsetYears` (src/core2/modules/jobs.ts line 3819) still returns 62 ("expected 62 to be 65", test line 52). Seen in Cottontown, Tennessee (4717420), run seed f3a0185fb36f1b72 (RETIRE_ONSET_SEED=f3a0185fb36f1b72), on main 3a9e824dddb, and in Bethlehem, North Carolina (3705530), run seed 31514229e28a0c71. Seen: the test passes in a drawn place.

**Cause.** Measured: Cottontown, Tennessee (4717420), run seed f3a0185fb36f1b72, on the train at 32a994212b, with a copy of the test that counts calls to its own mock. The date moves (January 20 to January 21, 2025) and the test's own call to the mocked `socialSecurityAges` returns 65, but the jobs engine never calls the mock: 0 mocked calls before, during and after the day's run. The test replaces `socialSecurityAges` on the laws module with `vi.mock`. src/core2/modules/jobs.ts is loaded inside that module's own imports while the real module is being read, so its import is bound to the real function. `retirementOnsetYears` therefore reads the real law, 62, at every place. The engine is right; the test never reached it.

**Fix.** The test moves the law the way the game does. `enactLaw` (src/core2/modules/laws.ts) enacts a federal act raising `social-security-earliest-claim-age` to 65, in force the next day; the engine answers 62 that day and 65 after one day's run. The mock is deleted. The test is pinned to the two places the red was seen at (Cottontown, Tennessee and Bethlehem, North Carolina). Nothing a player sees changes; the engine already read the law each day.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never weaken a test: the test's claim (the jobs engine reads the law in force the next day) stays. One rule, all 56 places: the place is drawn and named with its seed.

**Done when.** `npx vitest run src/core2/retirement-onset-law.test.ts` passes at its two pinned places (Cottontown, Tennessee and Bethlehem, North Carolina, with their world seeds in the file) and fails at both when the engine's daily read of the law is taken out; then a second session turns dev mode on in the running game in a drawn place, passes a federal bill raising the earliest claim age to 65, runs past its effective date, and sees in Trace that the jobs engine's retiring decisions for workers aged 62 to 64 in that town read the onset as 65.

**Waits on.** Nothing.

**Files.** src/core2/retirement-onset-law.test.ts, src/core2/modules/jobs.ts
