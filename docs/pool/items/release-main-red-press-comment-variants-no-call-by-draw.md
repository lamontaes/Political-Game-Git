---
id: release-main-red-press-comment-variants-no-call-by-draw
title: "The reporter-variant test is red by draw when none of its 12 places reaches a reporter's call"
area: release
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: M4's gate on #9130 (Nov 14, 2026), seed 22ca6468e73eb7aa
---

**What.** `src/director/press-comment-variants.test.ts` fails with no line composed at GOLDEN_PATH_SEED=22ca6468e73eb7aa. All 12 drawn places are passed over before a reporter's call: nine bills are not voted within 120 days (Westminster VT, Browns Mills NJ, La Grange IL, Stanley ND, Ahuimanu HI, Dedham MA, Rafael González PR, McLendon-Chisholm TX, Love Valley NC), two places have no resident member (Red Hook VI, Merizo GU), and in Fowler CO every local reporter has a tie to the member. A test red by the luck of the draw holds every train run it lands on.

Guards: the train's unit job.

**Cause.** Found in code: src/director/press-comment-variants.test.ts draws `ATTEMPTS = 12` places from `GOLDEN_PATH_SEED` or a random seed (line 20) and expects one to prove the call (line 354). Most drawn bills sit more than `VOTE_DAYS = 120` days, so the draw often runs out.

**Fix.** Test only, per skill drawn-place-tests and the train rule (account lead, Nov 14): pin the test to named places and seeds that reach a call. Keep about a minute's run, with an explicit timeout, and leave every assertion unchanged.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the pinned places are found by drawing, never chosen by name in logic, and each is named with its seed in the test. Never loosen an assertion.

**Done when.** A second session runs the test three times on the train head with no seed set, and it passes each time in about a minute, at the pinned places it names (a drawn place and seed recorded in the test, such as the one the builder finds reaching a call).

**Waits on.** nothing.

**Files.** src/director/press-comment-variants.test.ts
