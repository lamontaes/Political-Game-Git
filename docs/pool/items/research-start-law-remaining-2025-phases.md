---
id: research-start-law-remaining-2025-phases
title: "Research: the January 2025 law for local taxes, local wages, corporate tax and unemployment terms"
area: laws
kind: research
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on: research-start-law-remaining-2025-phases-part-1-local-taxes, research-start-law-remaining-2025-phases-part-2-minimum-wage-tiers, research-start-law-remaining-2025-phases-part-3-corporate-and-unemployment, research-start-law-remaining-2025-phases-part-4-territories
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: low
root: rc9-place-facts-one-default
lead: laws
after:
checked: fable 2026-11-10
---

**What.** The opening still carries the January 2026 phase back to January 20, 2025 for county and city income taxes (150 jurisdictions), city sales taxes (61), county, city and some state minimum-wage tiers, state corporate income tax (50 states), local income tax authority, unemployment program terms and the five territories' income and sales taxes. The national tables for the federal and state taxes, SNAP, the Medicaid match and unemployment maximums now carry their sourced 2025 phase (data/research/laws/_-2025-_.json, built by scripts/research/build-starting-law.py). Source the phase in force on January 20, 2025 for each remaining series and place the same way, so rowsCarriedToStart in src/core2/modules/laws.ts reaches nothing and SG-GOV-start-law-carried-back resolves. The work is split into the four parts named in Waits on.

**Cause.** Found in code: scripts/research/check-start-law-2025.ts lists the series still carried back to January 20, 2025, and `rowsCarriedToStart` in src/core2/modules/laws.ts (line 203) still reaches them under the registered stopgap SG-GOV-start-law-carried-back.

**Fix.** Replace each carried-back series with its January 2025 table in src/core2/data/laws/starting-law.json via scripts/research/build-starting-law.py, until the check lists none and SG-GOV-start-law-carried-back is resolved. Take the four parts below one at a time.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: the 2025 phases calibrate the law in force at the start, read from published tables with a quote for each figure. Estimate, never UNKNOWN: a place a source lacks takes the nearest sourced phase, marked ESTIMATED with its reason. One rule, all 56 places: every figure lives in a per-place table keyed by jurisdiction.

**Done when.** A second session runs scripts/research/check-start-law-2025.ts and sees it list no series still carried back to January 20, 2025, finds SG-GOV-start-law-carried-back resolved in src/core2/data/stopgaps/gov.json, and sees a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) show the town's law rows in force on day one with no :from-start record id. Each of the four parts records its own evidence.

**Waits on.** Its four parts: research-start-law-remaining-2025-phases-part-1-local-taxes, research-start-law-remaining-2025-phases-part-2-minimum-wage-tiers, research-start-law-remaining-2025-phases-part-3-corporate-and-unemployment, research-start-law-remaining-2025-phases-part-4-territories.

**Files.** scripts/research/build-starting-law.py, scripts/research/check-start-law-2025.ts, src/core2/data/laws/starting-law.json, src/core2/modules/laws.ts, src/core2/data/stopgaps/gov.json, data/research/laws/local-starting-law/local-income-tax.json

**Notes.** TODO Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it sources January 2025 values for local taxes, wages, corporate tax and unemployment the opening carries back from 2026; no one reads the difference.
