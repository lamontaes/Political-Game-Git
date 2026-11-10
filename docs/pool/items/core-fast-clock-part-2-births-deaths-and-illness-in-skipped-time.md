---
id: core-fast-clock-part-2-births-deaths-and-illness-in-skipped-time
title: "The fast clock, part 2: people are born, fall ill and die in skipped time at the pace they do day by day"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: opus
effort: high
root: design-country-tier
source: split from core-fast-clock-twenty-years by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
---

**What.** With only dated work running, nobody dies in a skipped year. Deaths, births and illness live in the health engine's daily loop. This part gives that engine a monthly step for skipped time, so a town does not stop aging and dying while nobody watches it.

**Cause.** Measured: Chumuckla, Florida (953 people; world seed aa4665b284a797eb671c6eafef8865086489b881e3eb81e1116a200598fb6482), one year: 59 deaths day by day, none with only the module calendar's dated work, one with a whole day run each month. Found in code: the health engine's daily work is its `onDay` (src/core2/modules/health.ts line 1077), which results mode does not run.

**Fix.** Give the health engine the monthly hook from part 1 (`onResultsMonth`, built in pull request 8171). Write this part's test in its own file, not in part 1's. For counted groups it applies a month of its own rules at once: the month's deaths, births and new illness by the same rates the daily loop reads, times each group's count. For the people kept as people (the player's household and circle, officials) it runs the same daily function for each day of the month, for those people only. Skill `lives` describes the coarse pace the engines already use for people who live elsewhere; use that path where it exists rather than writing another.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One model, two tiers: a counted group is read by the same rule as a full person, times its count. No dice: real rates check totals and never pick one person's outcome. One engine per mechanic. Speed: the step walks groups, never every person.

**Done when.** A second session runs the part's test in a drawn place it names with its seed and reads its printed line: deaths, births and people at year end for one year day by day and for the same year skipped. The skipped year's figures are within a fifth of the day-by-day year's, or the pull request explains each difference by its cause. A person in the player's household who died in the skipped year has a death record with a cause and a date inside the year.

**Waits on.** core-fast-clock-part-1-a-results-mode-for-skipped-time.

**Files.** src/core2/modules/health.ts, src/core2/life.ts, src/core2/results-mode-vitals.test.ts (new)
