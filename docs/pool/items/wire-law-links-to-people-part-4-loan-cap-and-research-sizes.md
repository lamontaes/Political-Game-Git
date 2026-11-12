---
id: wire-law-links-to-people-part-4-loan-cap-and-research-sizes
title: "The loan-rate cap past its lag, and family 10 research sizes"
area: laws
kind: wiring
priority: 3
size: S
status: dropped
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
checked: fable 2026-11-10
---

**What.** Part of wire-law-links-to-people. The loan-rate cap acts after a 12-month lag that the web does not yet carry to a lender's rate, and family 10 of the effects plan needs its researched sizes added to the link table.

**Cause.** Found in code: in data/research/outcome-web/links.json the two loan-cap links, loan-rate-cap-to-high-cost-borrowing (line 3482) and federal-loan-cap-to-high-cost-loans (line 3946), both carry status built with lagMonths 12, so that half is on main. Seven links of family 10 in docs/reports/effects-web-plan-2026-10-29.md (the research family: eviction care, broadband, transit, heat, air-conditioning use and carbon monoxide) still carry status size-not-set: eviction-to-homelessness (line 1923), eviction-to-hospital-visits, broadband-to-employment, transit-loss-to-unemployment, heat-to-deaths, energy-price-to-ac-use and carbon-monoxide-to-absence. The family's eighth, birth-year-pollution-to-adult-earnings, is graded person-level and is not this item's.

**Fix.** Research a size for each of the seven links (pages fetched and quoted, SOURCED or ESTIMATED with a range, following .agents/skills/researcher/SKILL.md) and add it to the link's row in links.json; a link the research finds no effect for is graded about zero with the quote. Do not rebuild the loan cap: the Done when below has a second session look at it, and if that look fails, write what was seen as a new item.

**Time box.** 6 hours for one Sonnet session.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. Wire to the world and an effect is a read, not a record: the law in force changes, the engine that pays or decides reads it, and a named person's money or view moves. The chain is the acceptance. A missing reader is a registered stopgap naming the engine, not a new mechanic.

**Done when.** A second session plays a drawn place that has a lender (place and seed named) and sees the loan cap change a borrower's rate after the 12-month lag, by record id; family 10's sizes are in data/research/outcome-web/links.json with their sources and the outcome web tests pass.

**Waits on.** Nothing.

**Files.** docs/reports/effects-web-plan-2026-10-29.md, data/research/outcome-web/links.json, src/core2/modules/outcome-web.ts, scripts/outcome-web/effect-matrix.ts

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have added a twelve-month lag to a lender's rate under a loan-rate cap and sized a family of links from research; no player reads the lag.
