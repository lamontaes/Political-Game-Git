---
id: dev-tests-draw-place-and-pass-dollars-as-cents
title: "dev-chair, dev-discharge and dev-discharge-state draw their place at run time and pass a minimum wage that is not whole cents"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: vote-reasons thread, gate of #9646 on Train ef708196, Nov 16; Account lead, Nov 16 03:55Z ("they cannot sit as known reds")
---

**What.** On Train ef708196, three tests are red, with and without #9646. They fail with the seeds the gate drew: src/bench/dev-chair.test.ts (DEV_MODE_SEED e8c451896b2115d7, Princeton, New Jersey), src/bench/dev-discharge.test.ts (4d1e24c1e726a8a8, Reading, Michigan) and src/bench/dev-discharge-state.test.ts (38091ae4983cb645). With other seeds they pass. All three throw "An amount of money in a law is in whole cents." from `wholeMoney` (src/bench/dev-mode.ts line 364) inside `DevMode.introduce`, before any vote is held.
Seen: the gate log of #9646 and a replay of each seed with the base dev-mode.ts.

**Cause.** Found in code: src/bench/dev-mode.ts `wholeMoney` (line 364) refuses the value. Each test introduces `minimum-wage` with `value: 30 + n / 10` (dev-chair.test.ts line 39, dev-discharge-state.test.ts line 55, dev-discharge.test.ts line 41). `introduce` takes the unit from the first `minimum-wage` law row in the world that has a unit (dev-mode.ts line 1038). Where that unit is a minor (cents) unit, a value with a tenth is refused. Whether such a row exists depends on the drawn place, and the place and seed come from `randomBytes` at run time (dev-chair.test.ts line 14, dev-discharge.test.ts line 15, dev-discharge-state.test.ts line 17), so the test goes red or green with the draw. dev-acceptance.test.ts already passes whole cents (`3000 + count`).

**Fix.** Pass whole-cent values in the law's own unit, as dev-acceptance.test.ts does. Pin each test to a named place and seed, found by a script outside the test, with a limit near twice the slower of its time alone and its time beside other tests (skill `pinned-tests`). Do not loosen `wholeMoney`.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** One rule, all 56 places: a test names its place and seed, so the same test reads the same world on every run and never goes red by draw (pinned-tests; Account lead, Nov 16).

**Done when.** All three test files name a fixed place and seed, pass whole-cent values, and pass three times in a row alone and beside the other dev tests; each was seen red once with a value that is not whole cents. A second session, in the running game at a place drawn from all 56, introduces a minimum-wage bill from dev mode at a whole-cent value and sees it reach the floor.

**Waits on.** Nothing.

**Files.** src/bench/dev-chair.test.ts, src/bench/dev-discharge.test.ts, src/bench/dev-discharge-state.test.ts

**Notes.**
