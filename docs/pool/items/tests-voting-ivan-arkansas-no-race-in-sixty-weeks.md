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
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: found Nov 10 by the builder of tests-m2-07-drawn-place-without-race (pull request #8218)
checked: fable 2026-11-10
---

**What.** The voting test now waits up to 60 weeks in a drawn place for a local or state race that two residents can file for. In Ivan, Arkansas it waits the whole 60 weeks, finds none, and runs in another place. Either the place really has no such race for more than a year, which a player living there would feel, or something refuses the filings that should not. Seen: a player in Ivan, Arkansas finds a local or state race to file for within a year, which none shows in 60 weeks.

**Cause.** Needs cause. Looked at: the builder's report on pull request #8218. With GOLDEN_PATH_SEED=8204cf02c98b04d40207d6a46ee6d70f291c3712872130e95c5e24b207debf76 and GOLDEN_PATH_PLACE_KEY=0534540, src/core2/voting.test.ts passed over Ivan and ran in place 3354740 after 14 weeks. Nobody has printed Ivan's races, the days their filing opens, or why each refused the two residents. In Braggs, Oklahoma the same kind of wait was explained: the first races to open refuse an 18-year-old on minimum age, and the town's own council opens 69 weeks after the start.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session: print, for Ivan on that seed, every contest with the day its filing opens, its deadline and its election day, and for each one that opens in the 60 weeks the rule that refused each resident (`fileCandidacy` returns the unmet requirements). Then rewrite this item with `Found in code:` or `Measured:` and a real Fix, or propose it for dropping if the calendar is simply the place's own.

**Rules.** One rule, all 56 places: nothing is fixed for Ivan by name. This is a game, not a spreadsheet: a long wait that is the place's real calendar is not a defect, and the Politics guide already names the day filing opens. Never loosen a filing rule to make a test pass.

**Done when.** A second session reads the finding: for Ivan, Arkansas in a drawn world (seed named) the item names each race, the day it opens and the rule that refused the residents, by record id, and the item is rewritten with its cause and a Fix or proposed for dropping.

**Waits on.** Nothing.

**Files.** src/core2/voting.test.ts, src/core2/modules/elections.ts

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=0534540 GOLDEN_PATH_SEED=8204cf02...df76 npx vitest run src/core2/voting.test.ts`: the test passes (exit 0) and still prints "M2-07: ... passed over 0534540 (no race two residents could file for within 60 weeks); ran in 3354740 after waiting 14 weeks". So Ivan still has no fileable race in 60 weeks. Fresh draw `GOLDEN_PATH_SEED=27cdd13a2420118b`: green, ran in 3466390 after 3 weeks, none skipped. Green test; the behavior in Ivan reproduces.
