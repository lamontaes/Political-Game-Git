---
id: metrics-registry-test-draws-random-seed
title: "Pin the Metrics registry test's drawn places and find why a territory has no town government for the player"
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
lead: screens
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: Account lead thread "Show last year on the metrics", Nov 14
---

**What.** `src/bench/metrics-registry.test.ts` draws one of its two places at random, so it is red or green by draw. Seen: Metrics' budget heading and the Budgets tab in a drawn place; for the draw below the played town has no government of its own.

**Cause.** Measured: seed 9ca49eb7074e5581, Fananganan, Northern Mariana Islands, `buildBenchWorld(seed, gameStartDate(), { twoLevel: true })`, run to 2026-03-25: the assertion at the town-government line (`town?.jurisdictionId` equals the place) gets undefined. Red the same way on train head 8bb1ff9d without any Metrics change. Why `budgetView(core, playerId).townGovernmentId` names no government there is not yet found.

**Fix.** Pin the second place in the test file to a named place and seed (the way the first is), keep Fananganan as a named replay, and find in `src/core2/modules/budgets.ts` (`townGovernment`) and `src/bench/budget.ts` why a territory's played town has no city or county government, then fix it in that engine or file it against the territory local-government item.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Never loosen the test. Pinned places and seeds, about a minute each, explicit timeouts.

**Done when.** A second session runs the test and sees it green on both pinned places, and Metrics in Fananganan shows a budget heading naming its government or the item says why none exists.

**Waits on.** Nothing.

**Files.** src/bench/metrics-registry.test.ts, src/core2/modules/budgets.ts, src/bench/budget.ts
