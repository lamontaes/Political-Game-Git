---
id: world-disaster-no-market-test-red-again
title: "disasters-no-market red on main again: the Guthrie, Oklahoma repro no longer finds a town with nobody to pay"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc2-done-from-records
source: added with npm run pool -- add
---

**What.** src/core2/disasters-no-market.test.ts (the regression test from world-disaster-repairs-no-outside-market, PR #5327) fails on clean main (31ad11a8c6, Oct 28 23:20 UTC): 'Guthrie, Oklahoma (4031700), seed 35f504a41ec4764f52666b6c5ccd1992aa077e83: a town with nobody to pay: expected undefined to be defined'. The named case no longer reaches a town with no open builder and no outside market on the eve of a damaging disaster, so the path the test guards is not played. The drawn case passes. Found by the laws session while gating the disasters family.

**Cause.** Measured: src/core2/disasters-no-market.test.ts on main 31ad11a8c6, Guthrie, Oklahoma place 4031700 seed 35f504a41ec4764f52666b6c5ccd1992aa077e83 ("a town with nobody to pay: expected undefined to be defined"). The main commit that moved the named repro off the no-payee path is not yet named.

**Fix.** Find the commit on main that moved the named repro off the no-payee path, then play the path in that repro or name a new repro that does; never loosen the assertion.

**Time box.** 2 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: where no builder and no outside market is recorded on the eve, no repair money moves and the journal still balances. The test must still play the no-payee path in the named repro or name a new repro that does; a test passes only if it asserts the path ran (damaged homes, payees on the eve, no repair paid, journal balanced). Never loosen the assertion to pass.

**Done when.** A second session (not the builder) runs src/core2/disasters-no-market.test.ts on main and sees it pass with both cases asserting the path ran; the PR body names which change on main moved the named repro (Guthrie, Oklahoma, a drawn place) off the path (by commit) and the disaster record id, damaged homes and payees on the eve for the case it now plays.

**Waits on.** Nothing.

**Files.** src/core2/disasters-no-market.test.ts, src/core2/modules/disasters.ts

**Notes.** Oct 28: the earlier item world-disaster-repairs-no-outside-market is done; this is its test turning red again.
