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
checked: fable 2026-11-10
---

**What.** src/core2/disasters-no-market.test.ts (the regression test from world-disaster-repairs-no-outside-market, PR #5327) fails on clean main (31ad11a8c6, Oct 28 23:20 UTC): 'Guthrie, Oklahoma (4031700), seed 35f504a41ec4764f52666b6c5ccd1992aa077e83: a town with nobody to pay: expected undefined to be defined'. The named case no longer reaches a town with no open builder and no outside market on the eve of a damaging disaster, so the path the test guards is not played. The drawn case passes. Found by the laws session while gating the disasters family. Guards: the repairs a disaster pays for in a town with no builder, as the paper and town budget show them, which the disasters test keeps working.

**Cause.** Needs cause. Looked at: src/core2/disasters-no-market.test.ts on main 31ad11a8c6 in Guthrie, Oklahoma (place 4031700, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83), which fails at line 153 ("a town with nobody to pay: expected undefined to be defined"): the world the test names no longer holds a town whose households have nobody to pay. Not yet known: which change on main moved that world off the path, whether the test still fails on today's main, and whether any drawn place still reaches the no-payee path (if none does, the path is dead code and the item becomes its removal). To find it: run the test on today's main, then walk the test's own draws (line 211, purpose disasters-no-market) and count the places that reach the path.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: where no builder and no outside market is recorded on the eve, no repair money moves and the journal still balances. The test must still play the no-payee path in the named repro or name a new repro that does; a test passes only if it asserts the path ran (damaged homes, payees on the eve, no repair paid, journal balanced). Never loosen the assertion to pass.

**Done when.** A second session (not the builder) runs src/core2/disasters-no-market.test.ts on main and sees it pass with both cases asserting the path ran; the PR body names which change on main moved the named repro (Guthrie, Oklahoma, a drawn place) off the path (by commit) and the disaster record id, damaged homes and payees on the eve for the case it now plays.

**Waits on.** Nothing.

**Files.** src/core2/disasters-no-market.test.ts, src/core2/modules/disasters.ts

**Notes.** Oct 28: the earlier item world-disaster-repairs-no-outside-market is done; this is its test turning red again.

**Notes (Fable's check, Nov 10).** When the cause is found, the fix plays the path in a place that reaches it, found by the test's own bounded draws and named in the failure message, and never loosens the assertion.

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/disasters-no-market.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=35f504a41ec4764f52666b6c5ccd1992aa077e83. Still red, 1 of 2. First failing assertion as printed: `AssertionError: Guthrie, Oklahoma (4031700), seed 35f504a41ec4764f52666b6c5ccd1992aa077e83: a town with nobody to pay: expected undefined to be defined` at src/core2/disasters-no-market.test.ts:153.
