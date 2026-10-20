---
id: core-stopgap-parameters-retired-stock-generation-control
title: "Stopgaps in parameters (retired-stock-generation-control): 2 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind retired-stock-generation-control"
claimed-at:
---

**What.** Replace or clear the 2 open retired-stock-generation-control stopgap row(s) in src/core2/data/parameters.json: SG-P8-param-openingRetirementPayerReserveMonths, SG-P8-param-openingRetirementFundingLiquidShare. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/parameters.json

**Notes.** First row: Compatibility key only. New retirement views and outside-flow owners start at zero; no prepaid stock, annual-flow-to-cash conversion or survival buffer remains in this candidate.

**Checked Oct 17.** Stale: both rows (SG-P8-param-openingRetirementFundingLiquidShare and SG-P8-param-openingRetirementPayerReserveMonths) are already `resolved` in src/core2/data/stopgaps.json. Nothing to build; the CTO can drop this item.

Dropped (CTO, Oct 19, 2026): every row it names is already resolved in stopgaps.json.
Checked Oct 19 (claude/retirement-reserve-params): both rows are already resolved in `src/core2/data/stopgaps.json`. `SG-P8-param-openingRetirementPayerReserveMonths` (line 735) and `SG-P8-param-openingRetirementFundingLiquidShare` (line 771) carry `"status": "resolved"` with "Done Oct 13 (OPUS-CORE): the retired key is removed; no producer read it", and neither key is in `src/core2/data/parameters.json` or read by any source file (`grep` of `src/` finds them only in `stopgaps.json`). Nothing is left to build; the CTO can set this item done.

Checked Oct 19 (claude): every stopgap row this item names is already resolved in src/core2/data/stopgaps.json: SG-P8-param-openingRetirementPayerReserveMonths is resolved in stopgaps.json (Remove the legacy parameter after root callers/saved evidence are migrated; genuine due-source and signed-flow accounting remain separate ob...); SG-P8-param-openingRetirementFundingLiquidShare is resolved in stopgaps.json (Retain historical source records; remove unused compatibility key in a separately reviewed save migration. Done Oct 13 (OPUS-CORE): the reti...). The CTO can drop this item.
