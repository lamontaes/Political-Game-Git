---
id: web-one-line-above-base-reader
title: "The outcome web reads a budget line above its base two ways: one reader for every line"
area: laws
lead: laws-effects
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: laws-and-effects lead, Oct 27 (merging main into #5669)
---

**What.** After rights (#5669) and health (#6026) both land, src/core2/modules/outcome-web.ts reads a budget line above its Census base two ways. The parks and highways lines go through lineAddedPct, from the government measures kept in src/core2/gov-measures.ts. The hospitals, welfare and higher education lines go through budgetLineAddedPct, which weighs every government's line by the town's share. Main's schools reader is a third. One rule should read every line, so a law's web cell grades the same way whichever line it moves.

**Rules.** Replace, never layer (owner, Oct 14): the kept reader replaces the others in the same change, and the PR body counts what was removed. One rule, all 56 places. The chain is the acceptance: regrade the law matrix after the change.

**Done when.** One reader in src/core2/modules/outcome-web.ts serves every budget-line-above-base measure, the other readers are deleted, and the law matrix regenerated on main grades the parks, highways, schools, hospitals, welfare and higher education lines as before or names each change by record id from a played world (buildBenchWorld) run in a drawn place with its seed.

**Time box.** 2 hours, one Sonnet builder; after #5669 merges.

**Files.** src/core2/modules/outcome-web.ts, src/core2/gov-measures.ts, src/core2/data/outcome-web/outcome-web.json, docs/reports/law-wiring-matrix.json

**Notes.** Filed by the laws-and-effects lead, Oct 27, while merging main (with health) into #5669; kept both there so the rights laws' grades did not move mid-merge. Take it after #5669 merges.
