---
id: research-start-law-remaining-2025-phases-part-2-minimum-wage-tiers
title: "The January 2025 county, city and state minimum-wage tiers"
area: laws
kind: research
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: split from research-start-law-remaining-2025-phases in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Source the phase in force on January 20, 2025 for the county, city and some state minimum-wage tiers that the opening still carries back from January 2026. Read each tier's wage and its effective date from the published schedule, quote it, and write the 2025 phase the same way the other tables were written. The part is done when the series no longer reaches the opening's law rows.

**Cause.** Found in code: scripts/research/check-start-law-2025.ts lists the series still carried back to January 20, 2025, and `rowsCarriedToStart` in src/core2/modules/laws.ts (line 203) still reaches them under the registered stopgap SG-GOV-start-law-carried-back.

**Fix.** Read each remaining minimum-wage tier's rate in force on January 20, 2025 with its schedule quoted, add the phase, and rebuild src/core2/data/laws/starting-law.json with scripts/research/build-starting-law.py until the check lists none of these tiers.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: the 2025 phases calibrate the law in force at the start, read from published tables with a quote for each figure. Estimate, never UNKNOWN: a place a source lacks takes the nearest sourced phase, marked ESTIMATED with its reason. One rule, all 56 places: every figure lives in a per-place table keyed by jurisdiction, never a place named in logic.

**Done when.** A second session runs scripts/research/check-start-law-2025.ts and sees the county, city and state minimum-wage tiers no longer listed as carried back to January 20, 2025, then plays a one-year world (buildBenchWorld) in a drawn place that has those series (place and seed named in the PR) and finds the town's law rows for them in force on day one with a sourced 2025 phase and no :from-start record id.

**Waits on.** Nothing.

**Files.** scripts/research/build-starting-law.py, scripts/research/check-start-law-2025.ts, src/core2/data/laws/starting-law.json, src/core2/modules/laws.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): one part of the January 2025 start-law sourcing; the numbers may stay estimates.
