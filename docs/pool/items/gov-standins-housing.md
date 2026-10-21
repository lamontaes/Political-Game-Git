---
id: gov-standins-housing
title: "Housing-engine stand-ins replaced or relabeled as sourced estimates"
area: world
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-v8txtd
pr: #5205
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:19:12.591Z
---

**What.** The housing engine (src/core2/modules/housing.ts and its helpers) carries stand-ins that are registered as open stopgap rows: the one ownerless landlord, the pooled counted rent, the eviction steps recalled from secondary summaries, a hearing without a judge, the vacancy rule and the property-tax rate and due dates. Sent-back PR #4146 (branch stopgaps/gov-world) removed the eviction hearing, judgment and payment-plan steps and several markers in one change. Finish it in bounded parts: for each row either replace it with the real mechanic, or relabel it as a sourced estimate with a source and a spread, and clear its row in src/core2/data/stopgaps.json only when the fake is gone.

**Rules.** Placeholders: a row is never closed by deleting it without the mechanic, and an unregistered placeholder is a defect. Replace, never layer: the old code and markers are deleted in the same change that replaces them. Estimate, never UNKNOWN: a relabeled stand-in shows its source and spread. One rule, all 56 places: eviction steps and due dates come from place data. Courts come after early access (AGENTS.md), so check the register before removing any court step.

**Done when.** For each housing row changed, a test in src/core2/housing.test.ts in a drawn place (buildBenchWorld, seed named in the PR body) shows the replaced behavior by case or lease record id, and the stopgap tripwire test shows the row resolved or relabeled in stopgaps.json. The owner plays it: let rent go unpaid and read what the landlord does and why.

**Files.** src/core2/modules/housing.ts, src/core2/housing-property-tax.ts, src/core2/housing-occupancy.ts, src/core2/data/housing/housing.json, src/core2/data/stopgaps.json, src/core2/housing.test.ts

**Notes.** Oct 19 (claude/standins-housing, released). Do not port PR #4146's housing slice mechanically: it deletes mechanics and markers on a main that has moved. Take one row at a time from the per-engine items world-stopgap-housing-faked-mechanic and world-stopgap-housing-property-tax-faked-mechanic.
