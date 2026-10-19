---
id: gov-standins-laws
title: "Law-reach stand-ins (groups A and B) replaced or relabeled as sourced estimates"
area: laws
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from gov-world-standins-oct14
---

**What.** PR #4146 (branch stopgaps/gov-world) relabeled or replaced 30 stopgap rows across several engines in one change, and it can no longer be merged: main moved on and 42 files conflict. This item redoes the law-reach rows (groups A and B) against main's current files, one engine's worth at a time. For each row, either build the real mechanic and close the row, or turn the stand-in into a labeled estimate with its source and spread and state what replaces it. The rows are: SG-GOV-REACH-A-leave-claims, SG-GOV-REACH-A-bargaining, SG-GOV-REACH-A-union-dues, SG-GOV-REACH-A-cannabis-market, SG-GOV-REACH-A-consumer-credit, SG-GOV-REACH-A-housing-supply, SG-GOV-REACH-A-rent-assistance, SG-GOV-REACH-A-affordable-units, SG-GOV-REACH-A-rent-contracts, SG-GOV-REACH-A-eviction-cases, SG-GOV-REACH-A-pretrial, SG-GOV-REACH-A-redistricting, SG-GOV-REACH-B-territory-residents, SG-GOV-REACH-B-public-school-staff, SG-GOV-REACH-B-transit-fare-price, SG-GOV-REACH-B-mileage-fee-price, SG-GOV-REACH-B-broadband-bill, SG-GOV-REACH-B-medicaid-coverage, SG-GOV-REACH-B-assistance-benefits, SG-GOV-REACH-B-preschool-enrollment, SG-GOV-REACH-B-voucher-payment, SG-GOV-REACH-B-property-tax-bills, SG-GOV-REACH-B-building-cost, SG-GOV-REACH-B-energy-price, SG-GOV-REACH-B-retail-price, SG-GOV-REACH-B-business-cost, SG-GOV-REACH-B-land-use, SG-GOV-REACH-B-road-condition, SG-GOV-REACH-B-tuition, SG-GOV-REACH-B-park-use.

**Rules.** Placeholders: a row closes only when the real mechanic or a sourced, labeled estimate replaces the fake, never by deleting the row. Replace, never layer: the stand-in is deleted in the same change. Estimate, never UNKNOWN: a value a player can see starts from the real average with a spread and a source. One rule, all 56 places: the move names no place in code.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed and place named in the PR body) each listed row that is closed shows another engine reading what replaced it, by record id, and the rows still open in src/core2/data/stopgaps.json each carry a reason; the stopgap tripwire test and the tests for the changed engine pass.

**Files.** src/core2/law-reach/group-a.ts, src/core2/law-reach/group-b.ts, src/core2/data/laws/reach-group-a.json, src/core2/data/laws/reach-group-b.json, src/core2/data/stopgaps.json

**Notes.** Split Oct 19 from gov-world-standins-oct14 (see PR #5120 for the conflict list). The old branch stopgaps/gov-world holds the earlier attempt at each row; read its diff for the approach, then redo it on a fresh branch from main.
