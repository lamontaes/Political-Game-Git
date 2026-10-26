---
id: core-counted-births-deaths-weight
title: "Counted births, illnesses and deaths stand for as many real people as the household weight says"
area: core
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #4894
blocked-on:
source: "found measuring a year at two scales, Oct 17"
claimed-at:
---

**What.** `applyCountedFlows` in `src/core2/births-counted.ts` never reads a household's weight. Place 0843605 (seed wb3), a year from the start: at the sample size 22 births and 7 deaths in 2,170 people (10.1 and 3.2 per 1,000); opened at `countScale` 3 (6,594 weighted people) 21 births and 7 deaths (3.2 and 1.1 per 1,000). Expected counts, illness debts and the carry must be in real people: each expected birth or illness is the rate times the household's weight, and a realized event in a household's record consumes that weight from the carry (a baby added to a record stands for that many babies). Same for the illness cohorts and deaths.

**Rules.** One model, two tiers: the same rate per real person, times the count. No dice. Replace, never layer.

**Done when.** In a drawn town opened at `countScale` 3 (name place and seed), births and deaths per 1,000 weighted people over a year are within the sample-size town's, and a test beside `counted-weight.test.ts` states it.

**Files.** src/core2/births-counted.ts

**Notes.** Found while fixing the whole-cent benefit crash (world-benefits-weighted-whole). The departure and arrival path in the same function is dead where counted-moves is installed.

Sent back 2026-10-18 from PR #4894 (branch claude/counted-births-weight): The changed counted-births test and static checks pass, but release:check fails on docs/release/changes/jobs-raise-frozen-rows.md: id jobs-raise-frozen-rows was already consumed before this change range. Clean captured main passes release:check. Reconcile this inherited declaration with the already-landed change while retaining the counted-births implementation and its unique declaration, then rerun the changed-file gates.; finish on that branch, merge main into it first.
