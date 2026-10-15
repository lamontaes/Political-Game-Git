---
id: world-jobs
title: "Jobs."
area: world
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/world.md line 50 (unchecked checklist line)"
---

**What.** Jobs is the world checklist line that remains open. Hires (2.5 percent a month against JOLTS 3.6), quits (2.2 against 1.9), seasons by industry, entry and exit, and unemployment insurance are built on the two-level population. Open is layoffs at 0.04 percent a month against 1.4, which needs firm-level demand shifts so customers move between sellers. The player would notice people losing jobs because their employer lost customers, not only because a business closed.

**Rules.** No dice: a layoff comes from the firm's books, demand and the owner's choice, never a monthly chance; real JOLTS rates check totals and never pick one worker. Sliding scales and causes: nothing flips at a threshold. One model, two tiers: counted workers are laid off under the same rule as full workers. Look before you ask: verify main first, the line may be done.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) the layoff rate lands near the JOLTS 1.4 percent a month total and each layoff has a job record id, the firm's books record id showing lost demand, and the worker's unemployment insurance claim. The tests in src/core2/jobs.test.ts and src/core2/jobs-closure.test.ts pass. The owner plays it: watch a shop lose customers to a rival and lay off a neighbor.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-benefits.ts, src/core2/jobs.test.ts, docs/coordination/world.md

**Notes.** Checklist line from world.md; verify against main before starting.
