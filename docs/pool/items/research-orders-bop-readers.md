---
id: research-orders-bop-readers
title: "Wire two research files to readers (research-data-has-reader red on main)"
area: gov
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The research-data-has-reader guard is red on main: data/research/executive/orders-and-vacancies-2026-11.json (executive orders, legal limits, vacancy rules) and data/research/justice/bop-federal-offenses-2026.json (federal offenses and Bureau of Prisons terms) have no reader in src/ or scripts/. The awaiting-reader list may only shrink, so they cannot be allowlisted; each needs the code that should read it. Until each file has a reader it is data nobody uses, which the standing rule on effects counts as a placeholder.

**Rules.** An effect is a read, not a record: a file counts only when production code reads it at the moment it decides, such as an order's legal limit or a sentence's term. Research before building: the readers use the researched values and never decide an outcome from them alone.

**Done when.** tests/guards/research-data-has-reader.test.ts passes with both files read by production code (or one honestly allowlisted as raw source by the CTO) and each reader named by record id.

**Files.** data/research/executive/orders-and-vacancies-2026-11.json, data/research/justice/bop-federal-offenses-2026.json, scripts/audit/research-data-allowlist.json

**Notes.** TODO

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. Both files now have readers: src/core2/modules/federal-courts.ts line 19 imports data/research/justice/bop-federal-offenses-2026.json (and scripts/justice/derive-federal-stay-share.ts line 36 reads it), and scripts/research/check-orders-and-vacancies.ts line 45 reads data/research/executive/orders-and-vacancies-2026-11.json; neither file is in scripts/audit/research-data-allowlist.json. Medium confidence: the guard was not run, and the orders file is read by a script, not production code.
