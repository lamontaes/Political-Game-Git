---
id: wire-law-links-to-people-part-4-loan-cap-and-research-sizes
title: "The loan-rate cap past its lag, and family 10 research sizes"
area: laws
kind: wiring
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: split from wire-law-links-to-people in the pool redo, Nov 10, 2026
---

**What.** Part of wire-law-links-to-people. The loan-rate cap acts after a 12-month lag that the web does not yet carry to a lender's rate, and family 10 of the effects plan needs its researched sizes added to the link table.

**Cause.** Found in code: docs/reports/effects-web-plan-2026-10-29.md names the two loan caps (the lenders helper) and family 10, the research PR that adds sizes for eviction care, broadband, transit, birth-year air, heat, air-conditioning use and carbon monoxide; links live in data/research/outcome-web/links.json (`links.json`).

**Fix.** Wire the loan-rate cap past its 12-month lag in a place that has a lender, and add family 10's researched sizes (fetched and quoted, SOURCED or ESTIMATED with spread) to links.json.

**Time box.** 6 hours for one Sonnet session.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. Wire to the world and an effect is a read, not a record: the law in force changes, the engine that pays or decides reads it, and a named person's money or view moves. The chain is the acceptance. A missing reader is a registered stopgap naming the engine, not a new mechanic.

**Done when.** A second session plays a drawn place that has a lender (place and seed named) and sees the loan cap change a borrower's rate after the 12-month lag, by record id; family 10's sizes are in data/research/outcome-web/links.json with their sources and the outcome web tests pass.

**Waits on.** Nothing.

**Files.** docs/reports/effects-web-plan-2026-10-29.md, data/research/outcome-web/links.json, src/core2/modules/outcome-web.ts, scripts/outcome-web/effect-matrix.ts
