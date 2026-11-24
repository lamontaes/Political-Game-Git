---
id: tests-promises-hand-staged-causes-played
title: "The promises tests reach the new coworker and the townsperson met through played paths, not hand-written records"
area: director
lead: words
kind: cleanup
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Account lead's ruling on #9517 and #9192, Nov 15 (a copied record is not staging, 09:31Z)"
checked:
---

**What.** Three causes in the promises work were written into the world by the tests instead of played: the missed payment behind every apology variant, the new coworker's hire for the show-around promise, and the townsperson the player meets before the attend ask. The first is replaced in #9517 by a player who really borrows and misses (tests/support/real-borrower.ts). The other two still stand, so the show-around and attend promises are proven only on records no engine made. Seen: in the played files for the show-around and attend promises, whose coworker and townsperson come from the test, not from the jobs engine or a meeting the player had.

**Cause.** Found in code: src/director/promises.test.ts `hireLike` (line 470) writes a job, commitment and payroll calendar by hand "as the jobs engine's hire does", and the attend test (line 858) picks a stranger and writes time together until the tie turns. src/director/apology-variants.test.ts wrote a `credit.payment-missed` record with `applyCoreEvent` (replaced in #9517 by `PAYDAY_BORROWER`).

**Fix.** Show-around: play the player's days until the jobs engine hires someone into the player's workplace (its own `hire`, the `job-offered` scene for a player taking work) and use that hire. Attend: play until the player meets a townsperson through a scene or a place they go, with the relationship engine's own time together. Both go through tests/support helpers like `playToQuarrel`, on named places and seeds. The player sees the same promises, now on people the game brought them.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: every promise in the played file names the engine record that brought the other person, by id, and no record is written by the test.

**Done when.** A second session runs the show-around and attend tests at their named place and seed, a drawn place pinned in the test, and finds the coworker's hire and the townsperson's meeting written by the jobs and relationship engines (record ids printed), with no `applyCoreEvent` or hand-made job in either test.

**Waits on.** Nothing.

**Files.** src/director/promises.test.ts, tests/support/real-borrower.ts

**Notes.**

- Nov 15: the apology variants' missed payment is replaced in #9517. The other two are the next PR after the friend asks (Account lead).
