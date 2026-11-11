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
model: sonnet
effort: high
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** A worker earns $2,092 over 120 days and is paid nothing because their employer pays no wages (La Liga, Puerto Rico, seed 4b22c467924caecf). Find why that employer's payroll does not run and fix it at the cause. Any worker whose employer owes wages is paid on payday. It may be the same family as world-town-public-works-staff-never-paid.

**Cause.** Needs cause. Looked at: La Liga, Puerto Rico (seed 4b22c467924caecf): a worker earns $2,092 over 120 days and receives nothing because the employer pays no wages; the payroll calendar is in src/core2/opening-payroll-calendar.ts and the wage posting in src/core2/modules/jobs.ts.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the worker's paychecks on the Journal; an employer's wages stop.

**Rules.** Wire to the world: the fix pays real dollars from the employer's account to the worker, shown on the journal. Ask why: the unpaid case is answered by record, naming the employer and the missing link.

**Done when.** A second session, on main in La Liga, Puerto Rico with seed 4b22c467924caecf, plays 120 days in dev mode and sees the worker who was paid nothing now paid, with wage journal entries by record id, and the same check in one more drawn place. A test names the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/opening-payroll-calendar.ts, src/core2/modules/jobs.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.

Sent back 2026-10-23 from PR #5011 (branch claude/worker-unpaid-four-months): The check-only slice would complete the original payroll-fix item without its paid-worker proof, and the script header overstates its resident-flow coverage; finish on that branch, merge main into it first.

**Notes (Fable's check, Nov 10).** How to find the cause: in the La Liga, Puerto Rico replay, follow that employer through a payday: its cash on the day, its row in the payroll calendar (src/core2/opening-payroll-calendar.ts) and the link from the worker's job to it. One of the three is missing or empty. The fix is then made there, so wage journal entries post on payday.
