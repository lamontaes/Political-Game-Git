---
id: world-worker-unpaid-four-months
title: "A worker earns $2,092 over 120 days and is paid nothing: their employer pays no wages (La Liga, Puerto Rico, seed 4b22c467924caecf)"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/worker-unpaid-four-months
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T00:04:58.775Z
---

**What.** In La Liga, Puerto Rico (seed 4b22c467924caecf) a worker earns $2,092 over 120 days and is paid nothing, because their employer pays no wages. Find which employer it is, why it holds no cash or no pay link, and fix the cause so the worker is paid. Check whether the same cause leaves other workers of employers of that kind unpaid.

**Rules.** Wire to the world: wages leave the employer's account and reach the worker's, shown by journal record. No dice: pay follows the employer's cash and the wage owed.

**Done when.** In a one-year run of the played world (buildBenchWorld) in La Liga, Puerto Rico with seed 4b22c467924caecf and in one other drawn place, no worker with wages owed goes more than one pay period unpaid, and each payment is shown by journal record id; a test in src/core2 states it.

**Files.** src/core2/modules/work.ts, src/core2/modules/business.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
