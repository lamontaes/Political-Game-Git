---
id: world-worker-unpaid-four-months
title: "A worker earns $2,092 over 120 days and is paid nothing: their employer pays no wages (La Liga, Puerto Rico, seed 4b22c467924caecf)"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #5011
after:
blocked-on:
lead: jobs
model: haiku
effort: low
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** A worker earns $2,092 over 120 days and is paid nothing because their employer pays no wages (La Liga, Puerto Rico, seed 4b22c467924caecf). Find why that employer's payroll does not run and fix it at the cause. Any worker whose employer owes wages is paid on payday. It may be the same family as world-town-public-works-staff-never-paid.

**Cause.** Measured: does not reproduce on main d64255aa (Nov 11). `buildBenchWorld("4b22c467924caecf", gameStartDate(), { twoLevel: true })`, the seed choosing the place as src/bench/dev-why.test.ts does, opens La Liga, Puerto Rico (jurisdiction_a34c020ec72650c6). After 120 days, all 138 jobs with pay requested (`core.work.totalsByJob`) had been paid something, and none is unpaid. Built with La Liga's place key (7240950) instead, 3 of 177 were unpaid, all hired in March or April with less than a pay period worked and no arrears (McCormick Care Home, Poole Manufacturing, Lawson's Market), so they had not reached a payday. No worker is owed months of pay. `DEV_WHY_SEED=4b22c467924caecf npx vitest run src/bench/dev-why.test.ts` still fails two cases at this seed, but on the country tier's bookkeeping check ("US-PR: 883957.8 jobs for 883823.2 workers", src/core2/modules/macro.ts about line 476), not on unpaid wages. That is already filed as core-country-tier-more-jobs-than-workers-in-outcome-web-tests and macro-country-jobs-over-workers-mid-cycle-start.

**Fix.** Nothing to build. The CTO drops the item as done by main. If a worker again goes a pay period past payday unpaid, file a new item with its place, seed, job id and `totalsByJob` row.

**Time box.** 0.5 hours for the CTO to read this and drop the item. Seen: the worker's paychecks on the Journal; an employer's wages stop.

**Rules.** Wire to the world: the fix pays real dollars from the employer's account to the worker, shown on the journal. Ask why: the unpaid case is answered by record, naming the employer and the missing link.

**Done when.** A second session, on main in La Liga, Puerto Rico with seed 4b22c467924caecf, plays 120 days in dev mode and sees the worker who was paid nothing now paid, with wage journal entries by record id, and the same check in one more drawn place. A test names the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/opening-payroll-calendar.ts, src/core2/modules/jobs.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.

Sent back 2026-10-23 from PR #5011 (branch claude/worker-unpaid-four-months): The check-only slice would complete the original payroll-fix item without its paid-worker proof, and the script header overstates its resident-flow coverage; finish on that branch, merge main into it first.

**Notes (Fable's check, Nov 10).** How to find the cause: in the La Liga, Puerto Rico replay, follow that employer through a payday: its cash on the day, its row in the payroll calendar (src/core2/opening-payroll-calendar.ts) and the link from the worker's job to it. One of the three is missing or empty. The fix is then made there, so wage journal entries post on payday.

Nov 11 (cause finder for Fable B): not reproduced. In the seed's own La Liga world every job with pay owed was paid by day 120. The dev-why test's failure at this seed is the country tier's jobs-over-workers check, already filed twice. I propose dropping the item as done by main.
