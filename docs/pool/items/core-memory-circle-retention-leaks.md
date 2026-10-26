---
id: core-memory-circle-retention-leaks
title: "A played world keeps three kinds of record past their retention: circle entries other than acts, old experienced keys under bookkeeping, and everyone's reasons under bookkeeping"
area: core
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/committee-heap
pr: #6067
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T16:44:16.717Z
---

**What.** Found while measuring the drawn two-year committee world (Gastonia, North Carolina, seed 93678d3573d46855). A circle member's weighed choices, the causes they shared or heard and their other entries without a decision never left the durable log; only their acts were dropped after circleActRetentionMonths. With bookkeeping on, forgetOldExperiences never ran, and keepsWhy kept every person's reasons (withholding records, campaign causes, ballot and stance reasons, staff work rows, drive why facts), so a test world held about 30 percent more than play.

**Rules.** Bookkeeping is validation, tracing, copying and freezing, never retention. Keep the player's own entries, public records and news. Never weaken a test's assertions; a test that reads a stranger's reasons turns the retention on explicitly.

**Done when.** In a one-year or longer run of the played world (buildBenchWorld, a drawn place named with its seed), the circle's weighed choices go after circleDecisionDetailDays and their other entries after circleActRetentionMonths, old experienced keys go with bookkeeping on, and keepsWhy follows the play rule under bookkeeping; a test in src/core2/condense-decisions.test.ts proves the drops by record id, and the PR names the measured heap before and after at the same days. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/decision-detail.ts, src/core2/state.ts, src/core2/knowledge-retention.ts, src/core2/why-kept.ts

**Notes.** TODO
