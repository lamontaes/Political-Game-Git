---
id: laws-natural-resources-estimated-link
title: "The natural resources budget line moves park access by an estimate from the nearest research, read by daily life"
area: laws
kind: wiring
priority: 1
size: S
status: open
claimed-by:
pr:
lead: laws
blocked-on:
source: added with npm run pool -- add
---

**What.** Owner ruling Oct 29 13:30 UTC (OWNER-DECISIONS.md): build the missing record as a background simulation from research, never a step the player takes, inside the engine that owns it (no system beside it). The law matrix grades the natural resources budget line stopgapped: no researched link starts from it (SG-LAW-outcome-link-unresearched; the research item research-outcome-link-natural-resources-line was dropped). Add one link from budget.naturalResources-added-pct (read like budget.parks-added-pct in gov-measures.ts) into parks.access-to-exercise, which the people engine's daily life already reads (PARK_ACCESS in modules/life.ts), sized from the nearest research (state park and conservation spending against park visits or access, fetched and quoted), tagged ESTIMATED with its spread and the reason it is the nearest.

**Rules.** Estimate, never UNKNOWN: the size carries its source, spread and why it is the nearest study. An effect is a read: the people engine's existing read of park access is the reader, no new one. One rule, all 56 places.

**Done when.** In a drawn place from all 56 (place and seed named) with the natural resources line raised in one world and not its twin, a named person's park access read in daily life is higher by the estimated size, by record id, and docs/reports/law-wiring-matrix.json grades the natural resources line wired. A test in src/core2 proves it on two seeds.

**Files.** src/core2/gov-measures.ts; src/core2/modules/outcome-web.ts; data/research/outcome-web/links.json; src/core2/modules/life.ts

**Notes.** TODO
