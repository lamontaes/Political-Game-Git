---
id: tests-voting-ivan-arkansas-no-race-in-sixty-weeks
title: "In Ivan, Arkansas no local or state race takes two residents' filings in 60 weeks"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: wire-elections
model: haiku
effort: low
root: rc9-place-facts-one-default
source: found Nov 10 by the builder of tests-m2-07-drawn-place-without-race (pull request #8218)
checked: fable 2026-11-10
---

**What.** The voting test now waits up to 60 weeks in a drawn place for a local or state race that two residents can file for. In Ivan, Arkansas it waits the whole 60 weeks, finds none, and runs in another place. Either the place really has no such race for more than a year, which a player living there would feel, or something refuses the filings that should not.

**Cause.** Measured: Ivan, Arkansas (0534540), seed 8204cf02c98b04d40207d6a46ee6d70f291c3712872130e95c5e24b207debf76: nothing refuses the filings; the test starts after Ivan's last window of the cycle has closed. A probe built the test's own world (src/core2/voting.test.ts `filedRace`, start `START` = 2026-01-05, line 48) and listed its contests: Ivan holds no town offices, only county races (commissioners, county judge, sheriff, prosecuting attorney, clerk, treasurer, assessor, coroner) and state races (governor down to state representative). Every one of them filed from 2025-09-12 or -13 to 2025-11-11 or -12 for the election of 2026-11-03, Arkansas's real calendar, so on 2026-01-05 all were closed and none opened again within 60 weeks (the next cycle's windows follow the 2026 results). The game itself starts on 2025-01-20 (src/core2/game-start.ts), when those windows are still eight months ahead, so a player living in Ivan does not wait this long; the wait is the test's start date.

**Fix.** Nothing to fix in the game. Proposed for the CTO: close this item. If the test should not pass over such places, start `filedRace` at `gameStartDate()` instead of the fixed `START` (src/core2/voting.test.ts line 48), as the played world does; that is a one-line test change a Haiku session can make with the rerun named above.

**Time box.** 1 hour for one Haiku session, only to close the item (or make the one-line start change) once the CTO decides. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: nothing is fixed for Ivan by name. This is a game, not a spreadsheet: a long wait that is the place's real calendar is not a defect, and the Politics guide already names the day filing opens. Never loosen a filing rule to make a test pass.

**Done when.** Either the CTO closes the item on this finding, or, after the one-line start change, a second session runs `GOLDEN_PATH_PLACE_KEY=0534540 GOLDEN_PATH_SEED=8204cf02c98b04d40207d6a46ee6d70f291c3712872130e95c5e24b207debf76 npx vitest run src/core2/voting.test.ts` and sees it run in the drawn place Ivan, Arkansas without passing it over, then sees it green on three fresh draws.

**Waits on.** Nothing.

**Files.** src/core2/voting.test.ts, src/core2/modules/elections.ts

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=0534540 GOLDEN_PATH_SEED=8204cf02...df76 npx vitest run src/core2/voting.test.ts`: the test passes (exit 0) and still prints "M2-07: ... passed over 0534540 (no race two residents could file for within 60 weeks); ran in 3354740 after waiting 14 weeks". So Ivan still has no fileable race in 60 weeks. Fresh draw `GOLDEN_PATH_SEED=27cdd13a2420118b`: green, ran in 3466390 after 3 weeks, none skipped. Green test; the behavior in Ivan reproduces.

Cause found (Nov 11, 2026, cause finder for Fable B): the probe listed Ivan's races and filing windows; all closed in November 2025, before the test's 2026 start.
