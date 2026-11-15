---
id: metrics-registry-test-draws-random-seed
title: "Pin the Metrics registry test's drawn places and find why a territory has no town government for the player"
area: core
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/metrics-registry-pin
pr: (next PR)
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: Account lead thread "Show last year on the metrics", Nov 14
---

**What.** `src/bench/metrics-registry.test.ts` draws one of its two places at random, so it is red or green by draw. For one draw the played town has no government of its own. The fix goes in the test file and the budgets engine, not in the screen. Seen: Metrics' budget heading and the Budgets tab in a drawn place.

**Cause.** Measured: seed 9ca49eb7074e5581, Fananganan, Northern Mariana Islands, `buildBenchWorld(seed, gameStartDate(), { twoLevel: true })`, run to 2026-03-25: the assertion at the town-government line (`town?.jurisdictionId` equals the place) gets undefined. Red the same way on train head 8bb1ff9d without any Metrics change. Why `budgetView(core, playerId).townGovernmentId` names no government there is not yet found.

**Fix.** Pin the second place in the test file to a named place and seed (the way the first is), keep Fananganan as a named replay, and find in `src/core2/modules/budgets.ts` (`townGovernment`) and `src/bench/budget.ts` why a territory's played town has no city or county government, then fix it in that engine or file it against the territory local-government item.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Ask why (owner, Oct 14): the town-government cause is named by record id, never guessed. Tests are pinned to named places and seeds, about a minute each, with explicit timeouts, and never loosened to pass.

**Done when.** A second session runs the test in a drawn place and seed nobody chose, and sees it green on both pinned places, and Metrics in Fananganan shows a budget heading naming its government or the item says why none exists.

**Waits on.** Nothing.

**Files.** src/bench/metrics-registry.test.ts, src/core2/modules/budgets.ts, src/bench/budget.ts

**Notes.** Nov 15, Account lead thread "Show last year on the metrics": cause found by reading, not an engine fault. The four territories (Guam, the U.S. Virgin Islands, American Samoa, the Northern Marianas) have no town government in the game, by the owner's ruling (Nov 14: they get local government after early access, with a notice), so `townGovernment` finds none and Metrics has no budget section there. The test now names two places with one seed each (Washington, Kansas, a named regression for notices served in the start year, and Everett, Georgia), no fallbacks, and a named territory test (Fananganan, seed 9ca49eb7074e5581, three months). The long tests' time is played days, said in their comments, with limits near twice the time measured.
