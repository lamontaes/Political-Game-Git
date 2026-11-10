---
id: tests-law-wiring-labor-one-subject-per-test
title: "law-wiring-labor.test.ts: split the one all-subjects test into one test per law, each built from a drawn world's records"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** src/core2/law-wiring-labor.test.ts runs one world through every labor law at once and needs all of the subjects in the same drawn town: a worker under the federal floor, a seated council member, a teacher, a full and a counted claimant, a claimant above the weekly maximum, and a public unit whose contract falls due inside the window. Few towns hold them all, so the test redraws up to ten worlds at about a minute each and on Nov 9 it ran 193 seconds to 7 minutes and failed with no place with a subject, with a different missing subject on each try. Widening one subject at a time does not help, because the next missing one stops the run. Guards: the labor laws the player passes (minimum wage, claims) reach paychecks and claims, with a test that runs in minutes.

**Cause.** Found in code: src/core2/law-wiring-labor.test.ts, the describe block at line 698, builds one world for every labor law and throws "no place with a subject" at line 722 when any one subject is missing; on Nov 9 it redrew ten worlds in 7 minutes. The Notes show that widening subjects one at a time moved the failure to a different missing subject on each try.

**Fix.** Split it into one test per labor law, each building its own subject through the core's seams (a pay re-rate, a seat) or drawing a world that has it, each finishing under 60 seconds, and delete the all-in-one test. A law is never skipped and no assertion is loosened.

**Time box.** 6 hours.

**Rules.** No dice and one rule for all 56 places: a drawn place and seed named in the message. A subject missing from a world is built through the core's own seams or its law is tested in a world that has it; never loosen an assertion. Speed: each test finishes under 60 seconds.

**Done when.** A second session runs src/core2/law-wiring-labor.test.ts and sees each labor law (the federal and state minimum wage, paid leave, right to work, the four payroll taxes, the unemployment maximum and claims, public bargaining, the local-wage authority) with its own test and its own one-subject setup, each finishing in under 60 seconds in a drawn world and passing on 10 of 10 random draws, each naming the place and seed. The all-in-one test is gone.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-labor.test.ts

**Notes.** Nov 9 (Laws and effects): tried widening the subjects. The governing body now accepts any city or county legislative seat, a claimant above the weekly maximum is built by re-rating the best-paid resident, and a bargaining contract not yet due is no subject; that moved the failure from try 0 to a different missing subject on each of ten tries (7 minutes). The bargaining contract falls due only when a government adopts its next fiscal year's budget, so a world opened in January has none inside a 35-day window in states whose year starts in July.
