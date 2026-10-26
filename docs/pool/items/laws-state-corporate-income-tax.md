---
id: laws-state-corporate-income-tax
title: "Starting-law rows for each place's state corporate income tax rate, sourced"
area: laws
kind: research
priority: 2
size: M
status: done
claimed-by: claude/laws-state-corporate-income-tax
pr: #4609
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T04:32:07.949Z
---

**What.** Add a state-level `corporate-income-tax` series to the starting law, one row per place that levies one (flat rate, or the bracket schedule in `terms`), each with its statute citation and retrieval date. Today `src/core2/data/laws/starting-law.json` has the federal 21% row and no state row for any of its 317 jurisdictions, so `payProfitTaxes` in `src/core2/modules/employer-taxes.ts` can pay only the federal share. Places with no corporate income tax get no row, and the reader treats a missing row as no tax, never as zero-by-default for a place that has one.

**Rules.** Research before building: rates come from each state's statute or revenue department, never from memory. One rule, all 56 places: the reader names no state; the data does. A value not yet researched is an ESTIMATE from the real average with its spread, never UNKNOWN. No dice.

**Done when.** A drawn place's `lawInForce(api, "corporate-income-tax")` at state level returns the researched row or none, with its citation, and a test in a random place of the 56 checks that every place with a state corporate tax has a row whose source is a statute or agency page. Digests under `data/research/laws/starting-law-2026/expected-digests/` match. The owner plays it: the state treasury's corporate line rises when a town business books profit (that wiring is `gov-town-payers-corporate-vehicle-tax`).

**Files.** `data/research/laws/starting-law-2026/*.json` and its digests, `scripts/research/build-starting-law.py`, `src/core2/data/laws/starting-law.json`.

**Notes.** Found 2026-10-16 while starting `gov-town-payers-corporate-vehicle-tax`: that item's part (1), the state corporate tax a town business owes, has no law rows to read. This item is what it waits on.
