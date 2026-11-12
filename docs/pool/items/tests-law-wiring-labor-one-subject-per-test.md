---
id: tests-law-wiring-labor-one-subject-per-test
title: "law-wiring-labor.test.ts: split the one all-subjects test into one test per law, each built from a drawn world's records"
area: laws
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-tests-law-wiring-labor-one-subject-per-test
pr: #8629
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:32:34.746Z
branch: claude/pool-tests-law-wiring-labor-one-subject-per-test
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

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:19 UTC) on branch claude/pool-tests-law-wiring-labor-one-subject-per-test.

Released (2026-11-11): a builder claimed this and did not start it (its draft said so and left the claim in place); Fable B released it so another builder can take it.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 05:21 UTC) on branch claude/pool-tests-law-wiring-labor-one-subject-per-test.

Released (2026-11-11): Reproduced on main 2026-11-11 (one run, 249 s, seed 2804b6fc1159bf058ba3f9e9e104c698a67de9c2): 'no place with a subject' after ten tries, each missing a different subject (no claimant earns above the weekly maximum x3, no seated council member x5, no teacher in the town, no full or counted jobs). The Fix (one test per labor law, each building its own subject through the core's seams, under 60 s) is a six-hour split of src/core2/law-wiring-labor.test.ts I did not start; the seams per subject are the open work. Continue on branch claude/pool-tests-law-wiring-labor-one-subject-per-test.

Released (2026-11-11): Read src/core2/law-wiring-labor.test.ts again: run(specId) (line 140 to about 690) is one 550-line flow that sets every labor law in the same world (repeals on day 0, grant on day 2, drafts and claims on day 5, a claim above the weekly maximum, teacher re-rate, council draft) and reads their effects together in one pass, so a per-law split is a rewrite of that function with each law's setup and read separated, not a search change. Not started; needs a six-hour session with the labor lead. Continue on branch claude/pool-tests-law-wiring-labor-one-subject-per-test.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 05:26 UTC) on branch claude/pool-tests-law-wiring-labor-one-subject-per-test.

Released (2026-11-11): Claimed by my own next loop, not worked: each needs Story-session lines under data/english/parts, a dedicated machine for speed runs, or a rewrite beyond one pass (see my earlier release notes on this item). Continue on branch claude/pool-tests-law-wiring-labor-one-subject-per-test.

Claimed by next for sonnet-13d3 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:32 UTC) on branch claude/pool-tests-law-wiring-labor-one-subject-per-test.
