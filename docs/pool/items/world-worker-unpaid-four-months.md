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

**What.** A worker earns $2,092 over 120 days and is paid nothing because their employer pays no wages (La Liga, Puerto Rico, seed 4b22c467924caecf). Find why that employer's payroll does not run and fix it at the cause. Any worker whose employer owes wages is paid on payday.

**Rules.** Wire to the world: the fix pays real dollars from the employer's account to the worker, shown on the journal. Ask why: the unpaid case is answered by record, naming the employer and the missing link.

**Done when.** Reproduce in La Liga, Puerto Rico with seed 4b22c467924caecf, where the worker is paid nothing over 120 days; after the fix the same run shows wage journal entries for that worker by record id, and a test names the place and seed.

**Files.** src/core2/opening-payroll-calendar.ts, src/core2/modules/jobs.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.
