---
id: web-matrix-engine-source-evidence
title: "The effect matrix names world-metrics for engine values owned by named readers or other modules"
area: docs
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/web-matrix-engine-source-evidence
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T07:04:43.943Z
---

**What.** The effect matrix reports every engine measure as world-metrics months.<field>, even when its configured provider is a named reader or another module. On clean main 636d375fe726ae99b927af83e8186a7f1b1cf87a, property-tax-to-rent is credited to world-metrics months. while housing.property-tax-rate is provided by the property-tax-rate reader. The report therefore points review evidence at a table that does not own that value, and the new schools-line reader inherits the same defect.

**Rules.** An effect is a read, not a record: evidence must name the actual configured producer or reader, not a generic unrelated table. One rule applies to all 56 places, and correcting provenance does not change grades or model data.

**Done when.** Running the official effect-matrix writer identifies the property-tax-rate and schools-line-above-base readers and the configured public-safety module, table and field for police officers. A focused test reproduces the clean-main blank evidence and passes with the correct providers; existing grades and model data remain unchanged.

**Files.** scripts/outcome-web/effect-matrix.ts, src/core2/data/outcome-web/outcome-web.json

**Notes.** Clean main636d report property-tax-to-rent cause evidence world-metrics months., lagged by causeAt. Generator line133 hardcodes world-metrics; same assumption at267 and471. Current5934 reader inherits baseline defect; not a new PR gate failure. Found by Merger 2 while auditing #5934. Separate baseline report provenance defect; not a school-link failure.
