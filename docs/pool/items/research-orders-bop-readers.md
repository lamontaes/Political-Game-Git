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

**What.** The research-data-has-reader guard is red on main: data/research/executive/orders-and-vacancies-2026-11.json (executive orders, legal limits, vacancy rules) and data/research/justice/bop-federal-offenses-2026.json (federal offenses and Bureau of Prisons terms) have no reader in src/ or scripts/. The awaiting-reader list may only shrink, so they cannot be allowlisted; each needs the code that should read it.

**Rules.** an-effect-is-a-read, research-habit

**Done when.** tests/guards/research-data-has-reader.test.ts passes with both files read by production code (or one honestly allowlisted as raw source by the CTO) and each reader named by record id.

**Files.** data/research/executive/orders-and-vacancies-2026-11.json, data/research/justice/bop-federal-offenses-2026.json, scripts/audit/research-data-allowlist.json

**Notes.** TODO
