---
id: gov-needs-opus-gov-124
title: "Needs from other sessions listed in OPUS-GOV.md (line 124): 3 lines"
area: gov
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/OPUS-GOV.md "Needs from other sessions" (line 124)'
---

**What.** Three requests remain from OPUS-GOV: core rows in `outside-flows.json` for the treasury and federal borrowing so the stricter M0-08 money check passes (with `setStandingContractAmount` for recipient-income contracts, SG-GOV-opening-award-level), a rerate for the residents' retirement flows, and a budget bill with no executive carrying `departmentRequests` lines (`legislature.ts` line 439). The money rows are being built by the gov-outside-revenue items; the rest need checking on main. Verify each line, close what is built, and split what is not into small items.

**Rules.** Wire to the world: each line closes when another engine reads what it wrote in a played year, named by record id; One model, two tiers: the retirement rerate applies to counted retirees by the same rule as full ones times their count; An effect is a read, not a record: a benefit level change is read by the payment on its next due date; Placeholders: SG-GOV-opening-award-level and SG-GOV-counted-* rows close only when the amounts follow the law; Look before you ask: check the gov-outside-revenue-* items first so nothing is built twice.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a Social Security cut or raise in a federal budget changes the retirement award of a named full person and of a counted retiree group from the next due date, `setStandingContractAmount` carries the new level on the journal, and a no-executive budget bill carries its `departmentRequests`. Each of the three lines in `docs/coordination/OPUS-GOV.md` is struck with an id. The owner plays it: cuts Social Security in a bill and watches a retiree's check shrink.

**Files.** src/core2/budgets-treasury.ts, src/core2/finance-state.ts, src/core2/modules/legislature.ts, src/core2/data/outside-flows.json, docs/coordination/OPUS-GOV.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
