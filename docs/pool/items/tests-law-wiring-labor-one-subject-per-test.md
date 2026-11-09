---
id: tests-law-wiring-labor-one-subject-per-test
title: "law-wiring-labor.test.ts: split the one all-subjects test into one test per law, each built from a drawn world's records"
area: laws
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/law-wiring-labor.test.ts runs one world through every labor law at once and needs all of the subjects in the same drawn town: a worker under the federal floor, a seated council member, a teacher, a full and a counted claimant, a claimant above the weekly maximum, and a public unit whose contract falls due inside the window. Few towns hold them all, so the test redraws up to ten worlds at about a minute each and on Nov 9 it ran 193 seconds to 7 minutes and failed with no place with a subject, with a different missing subject on each try. Widening one subject at a time does not help, because the next missing one stops the run.

**Rules.** No dice and one rule for all 56 places: a drawn place and seed named in the message. A subject missing from a world is built through the core's own seams (a pay re-rate, a seat) or its law is tested in a world that has it; a law is never skipped. Never loosen an assertion.

**Done when.** Each labor law (the federal and state minimum wage, paid leave, right to work, the four payroll taxes, the unemployment maximum and claims, public bargaining, the local-wage authority) has its own test with its own one-subject setup that finishes in under 60 seconds in a drawn world and passes on 10 of 10 random draws; the all-in-one test is deleted.

**Files.** src/core2/law-wiring-labor.test.ts

**Notes.** Nov 9 (Laws and effects): tried widening the subjects. The governing body now accepts any city or county legislative seat, a claimant above the weekly maximum is built by re-rating the best-paid resident, and a bargaining contract not yet due is no subject; that moved the failure from try 0 to a different missing subject on each of ten tries (7 minutes). The bargaining contract falls due only when a government adopts its next fiscal year's budget, so a world opened in January has none inside a 35-day window in states whose year starts in July.
