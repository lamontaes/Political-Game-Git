---
id: world-jobs
title: "Jobs."
area: world
kind: feature
priority: 2
status: done
claimed-by:
pr: #4904
blocked-on:
milestone:
source: "docs/coordination/world.md line 50 (unchecked checklist line)"
---

**What.** Checked against main on Oct 16: Layoffs exist and are driven by the books (`layOff` in jobs.ts records the decider and files an unemployment claim, tested at jobs.test.ts), but customers are re-split among sellers only at entry (residents.ts), so the layoff rate stays near 0.04% against the real 1.4% a month. Next: A monthly seller re-split in the residents engine. The player would see it as a choice among people, never a form.

**Rules.** No dice: a layoff comes from the firm's books, demand and the owner's choice, never a monthly chance; real JOLTS rates check totals and never pick one worker. Sliding scales and causes: nothing flips at a threshold. One model, two tiers: counted workers are laid off under the same rule as full workers. Look before you ask: verify main first, the line may be done.

**Done when.** A one-year run in a drawn place (buildBenchWorld, seed named in the PR body) shows the layoff rate near 1.4% a month, each layoff carrying a job-change record id, a books record id and an unemployment claim id. The owner plays it: A monthly seller re-split in the residents engine.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-benefits.ts, src/core2/jobs.test.ts, docs/coordination/world.md

**Notes.** Checklist line from world.md; verify against main before starting.
