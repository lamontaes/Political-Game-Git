---
id: world-full-workers-first-paycheck-cut-at-the-opening
title: "A full worker's first paycheck, the player's household's included, pays only the days since the world began"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-opening-month-pays-rent-before-any-pay
blocked-on:
root: day-one-in-motion
lead: money
model: sonnet
effort: medium
source: "found by T54 building world-opening-month-pays-rent-before-any-pay, Nov 15; Account lead's ruling 10:45Z: its own pull request, built right after"
---

**What.** A worker the game keeps as a full person (the player's household, the people the player meets, anyone filled in) is paid from the shifts they attend, and their shifts start the day the world is built. Their first paycheck pays only the days since then, while rent and bills are due in full, so the player's own household opens its first month short. Counted workers and officials already serving get their whole first period (world-opening-month-pays-rent-before-any-pay). Seen: in dev mode, the player's own first paycheck is a fraction of the next one.

**Cause.** Found in code: `openingWorkCommitments` in src/core2/modules/work.ts writes each commitment's `startsAt` as the opening date; `recordWorkAttendance` in src/core2/work-attendance.ts records only the current day's shift through a choice; and `prepareWorkPayAccrual` in src/core2/work-pay-period.ts with `validateEarnedBounds` in src/core2/work-payroll-cash.ts rejects any earned shift before the commitment starts. So the part of the pay period in progress that came before the opening is never earned and never paid.

**Fix.** The opening writes the period in progress as worked: each commitment starts at the first day of its payroll's period in progress, and the opening records the scheduled shifts between that day and the opening as attended, through the same ledger (`prepareWorkPayAccrual` and the earned pay periods the attendance module keeps), as seeded past, so the first payday after the opening pays the whole period from the employer's books. No flat top-up, no second ledger, no new parameter.

**Time box.** 4 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a full worker's first payday pays its whole period, as a counted worker's does. Day one is in motion. Every dollar balances.

**Done when.** A test pinned at a named place and seed shows a full worker's first payday after the opening paying the whole period, by commitment id. Year 1 and time per record at three named places before and after, and the player's household's balance at day one and on its first payday, are in the pull request body. A second session sees in dev mode, at a drawn place it names with its seed, the player's first paycheck equal to a full period's pay.

**Waits on.** world-opening-month-pays-rent-before-any-pay.

**Files.** src/core2/modules/work.ts, src/core2/work-attendance.ts, src/core2/work-pay-period.ts, src/core2/work-payroll-cash.ts
