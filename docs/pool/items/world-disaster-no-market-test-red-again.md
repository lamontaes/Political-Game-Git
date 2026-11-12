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
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** src/core2/disasters-no-market.test.ts (the regression test from world-disaster-repairs-no-outside-market, PR #5327) fails on clean main (31ad11a8c6, Oct 28 23:20 UTC): 'Guthrie, Oklahoma (4031700), seed 35f504a41ec4764f52666b6c5ccd1992aa077e83: a town with nobody to pay: expected undefined to be defined'. The named case no longer reaches a town with no open builder and no outside market on the eve of a damaging disaster, so the path the test guards is not played. The drawn case passes. Found by the laws session while gating the disasters family. Guards: the repairs a disaster pays for in a town with no builder, as the paper and town budget show them, which the disasters test keeps working.

**Cause.** Found in code: the path the named case guards can no longer happen, so the case cannot find a town for it. `townWithNoPayee` in src/core2/disasters-no-market.test.ts wants a town with a residents account, no open builder and no outside market. But the opening now gives every place with households an outside market: `outsideFor` in src/core2/residents.ts (about line 718) creates `outsideMarketAccount(placeId, start)` for any place whose households pay living costs and has none. Measured on main d64255aa in the named world (Guthrie, Oklahoma, 4031700, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83, drawn with "stories-from-engines"), on the eve of the year's first damaging disaster: the three towns with a residents account all have an outside market. These are the player's town jurisdiction_428ae74eb7734d24 (3 builders), jurisdiction_11eee12d9a148471, and jurisdiction_b0f9d889016644c9, the town whose missing market crashed the game in October. Every other place where full people live (states, other towns' kin, the central bank) has no residents account. So `townWithNoPayee` returns undefined, and the `catch { return; }` around `outsideMarketFor` in `payHouseholds` (src/core2/modules/disasters.ts, about line 669) is reachable only if a place gains households after the opening without a market. No such writer was found; moves.ts reads markets but does not create residents accounts. The drawn case still passes and still checks that a recorded payee is paid. The commit that made the market universal is not named: this checkout's history is shallow.

**Fix.** Remove the dead path, as this item's own Notes say to when no place reaches it. (1) Delete the named case ("plays a year through a disaster with no one to pay for repairs") and its helpers that only it uses (`townWithNoPayee`) from src/core2/disasters-no-market.test.ts. Keep the drawn case unchanged. (2) In `payHouseholds` in src/core2/modules/disasters.ts, replace the `try { … } catch { return; }` around `outsideMarketFor` with a plain call, so a town without a market fails loudly as a broken opening instead of silently skipping repairs. Update the comment above it. (3) Count the removed case and branch in the PR body. If the builder finds a writer that gives a place households after the opening (a new town the player moves to), keep the branch and file that writer instead.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: where no builder and no outside market is recorded on the eve, no repair money moves and the journal still balances. The test must still play the no-payee path in the named repro or name a new repro that does, unless no place can reach it, in which case the path and its case are removed together (as here); a test passes only if it asserts the path ran (damaged homes, payees on the eve, no repair paid, journal balanced). Never loosen the assertion to pass.

**Done when.** A second session (not the builder) runs src/core2/disasters-no-market.test.ts on main and sees the drawn case pass in a drawn place (named with its seed), with the disaster record id, damaged homes and the payee it paid printed. `git grep -n townWithNoPayee -- src` finds nothing, and the golden-path suite still passes.

**Waits on.** Nothing.

**Files.** src/core2/disasters-no-market.test.ts, src/core2/modules/disasters.ts

**Notes.** Oct 28: the earlier item world-disaster-repairs-no-outside-market is done; this is its test turning red again.

**Notes (Fable's check, Nov 10).** When the cause is found, the fix plays the path in a place that reaches it, found by the test's own bounded draws and named in the failure message, and never loosens the assertion.

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/disasters-no-market.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=35f504a41ec4764f52666b6c5ccd1992aa077e83. Still red, 1 of 2. First failing assertion as printed: `AssertionError: Guthrie, Oklahoma (4031700), seed 35f504a41ec4764f52666b6c5ccd1992aa077e83: a town with nobody to pay: expected undefined to be defined` at src/core2/disasters-no-market.test.ts:153.

Nov 11 (cause finder for Fable B): probed the named world on main d64255aa on the eve of its disaster, outside the repository. Every town with a residents account now has an outside market, because the opening creates one for each place with households. The guarded path is dead code, so the fix is its removal.
