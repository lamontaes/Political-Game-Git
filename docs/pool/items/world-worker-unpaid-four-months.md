---
id: world-worker-unpaid-four-months
title: "A worker earns $2,092 over 120 days and is paid nothing: their employer pays no wages (La Liga, Puerto Rico, seed 4b22c467924caecf)"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/worker-unpaid-four-months
pr: #5011
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T00:04:58.775Z
---

**What.** In La Liga, Puerto Rico (seed 4b22c467924caecf, the bench world from January 20, 2025, 120 days) a worker with a job (`person_688586e39370083b`) earned $2,092.53 and was paid $0.00; their cash is $0.00 and the cash journal shows only 8 outgoing payments ($1,591.92) from the cash they started with. The dev-why ledger (`pay earned / paid: $2,092.53 / $0.00`) shows it. An employer that pays no wages for four months is either a firm without cash (the wages shortfall record `residents.wages` and `unfundedBusinessReceipts` in modules/residents.ts, with the stopgap SG-WORLD-wages-skip-credit-line: a credit line is not drawn for wages) or a payroll that never started. Find which, name the employer and its books, and fix it at the root: a firm that cannot pay wages should draw its credit line, cut staff or close, and a worker unpaid for months should leave or be owed arrears visibly.

**Rules.** No dice: the firm's cash, credit and sales decide. Every dollar balances. One model, two tiers.

**Done when.** In a one-year run of a drawn place (name place and seed), no worker with an open job goes more than 60 days without a paycheck unless their employer's shortfall record names the arrears owed, shown by employer and worker record ids; a test names the place and seed.

**Files.** src/core2/modules/residents.ts, src/core2/modules/jobs.ts, src/core2/modules/business.ts

**Notes.** Found reproducing the failing dev-why test (release-suite-red-list-on-main). The test now follows a worker who was paid; this item is the worker who was not.
**What.** A worker earns $2,092 over 120 days and is paid nothing because their employer pays no wages (La Liga, Puerto Rico, seed 4b22c467924caecf). Find why that employer's payroll does not run and fix it at the cause. Any worker whose employer owes wages is paid on payday.

**Rules.** Wire to the world: the fix pays real dollars from the employer's account to the worker, shown on the journal. Ask why: the unpaid case is answered by record, naming the employer and the missing link.

**Done when.** Reproduce in La Liga, Puerto Rico with seed 4b22c467924caecf, where the worker is paid nothing over 120 days; after the fix the same run shows wage journal entries for that worker by record id, and a test names the place and seed.

**Files.** src/core2/opening-payroll-calendar.ts, src/core2/modules/jobs.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.
