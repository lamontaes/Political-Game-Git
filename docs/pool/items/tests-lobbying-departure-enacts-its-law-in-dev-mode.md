---
id: tests-lobbying-departure-enacts-its-law-in-dev-mode
title: "src/core2/lobbying-departure.test.ts enacts the law it needs through dev mode instead of opening just like today"
area: laws
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: history-laws-from-the-century
blocked-on:
lead: long-game
model: sonnet
effort: medium
root: rc1-world-outside-town
source: CTO line 6943316647 on #9747, Nov 17, 2026 (History, PR 4a, item 2)
checked:
---

**What.** `src/core2/lobbying-departure.test.ts` builds its world with the world setting `history: "today"`, so the state opens with its real starting law, because the test needs a particular law in force and a century world opens with whatever the century's bodies left.
Seen: the test's title names the law it needs, "(just like today: needs ...)".

**Cause.** Found in code: `src/core2/modules/laws.ts` `openLaws` loads day one's policy laws from the century's sessions (History family 4, PR 4a), so a world drawn for a law-mechanics test may not begin with the law the test exercises; the CTO approved "today" as the interim fixture (line 6943316647).

**Fix.**

1. Build the world in the default (century) setting.
2. Before the test's first step, enact the law it needs through dev mode's own call (`setLaw`, or the Bills panel's passage) and let it take effect.
3. Drop "(just like today: ...)" from the title, and keep every assertion the test makes.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Never loosen an assertion; the test still checks what the law does. A drawn place, named with its seed.

**Done when.** At a drawn place, named with its seed, `src/core2/lobbying-departure.test.ts` passes in a century world with the law enacted through dev mode, and fails with the enactment removed; a second session starts a new game at a drawn place, enacts the same law in dev mode and sees its effect in the running game (the law's Trace or "What came of it" line).

**Waits on.** history-laws-from-the-century (PR 4a).

**Files.** src/core2/lobbying-departure.test.ts
