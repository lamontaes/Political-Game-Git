---
id: research-start-law-remaining-2025-phases
title: "Research: the January 2025 law for local taxes, local wages, corporate tax and unemployment terms"
area: laws
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The opening still carries the January 2026 phase back to January 20, 2025 for county and city income taxes (150 jurisdictions), city sales taxes (61), county, city and some state minimum-wage tiers, state corporate income tax (50 states), local income tax authority, unemployment program terms and the five territories' income and sales taxes. The national tables for the federal and state taxes, SNAP, the Medicaid match and unemployment maximums now carry their sourced 2025 phase (data/research/laws/*-2025-*.json, built by scripts/research/build-starting-law.py). Source the phase in force on January 20, 2025 for each remaining series and place the same way, so rowsCarriedToStart in src/core2/modules/laws.ts reaches nothing and SG-GOV-start-law-carried-back resolves.

**Rules.** Research before building: the 2025 phases calibrate the law in force at the start, read from published tables with a quote for each figure. Estimate, never UNKNOWN: a place a source lacks takes the nearest sourced phase, marked ESTIMATED with its reason. One rule, all 56 places: every figure lives in a per-place table keyed by jurisdiction.

**Done when.** scripts/research/check-start-law-2025.ts lists no series still carried back to January 20, 2025, SG-GOV-start-law-carried-back is resolved in src/core2/data/stopgaps.json, and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) shows the town's law rows in force on day one with no :from-start record id.

**Files.** scripts/research/build-starting-law.py, scripts/research/check-start-law-2025.ts, src/core2/data/laws/starting-law.json, data/research/laws/local-starting-law/local-income-tax.json

**Notes.** TODO
