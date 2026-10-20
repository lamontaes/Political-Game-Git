---
id: core-stopgap-interest-groups-estimated-parameter
title: "Stopgaps in interest-groups (estimated-parameter): 1 open"
area: core
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/ig-bound-cost
pr: #5278
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/interest-groups.ts, kind estimated-parameter"
claimed-at: 2026-10-20T03:33:38.797Z
---

**What.** Replace or clear the 1 open estimated-parameter stopgap row(s) in src/core2/modules/interest-groups.ts: SG-GOV-bound-employer-cost-estimate. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/interest-groups.ts

**Notes.** First row: What a policy costs each employer it binds is an estimated share of the employer's payroll (boundEmployerCostShare), not the law's own cost, because most law-reach policies record who is bound and move no money.

Built in part Oct 20 (claude/ig-bound-cost): a consumer data privacy law now costs each bound employer what the business engine's monthly cost review charges (`businessDataPrivacyCostYear`, a share of its other operating costs), so the employer's stake reads that cost instead of a share of payroll (test: src/core2/data-privacy-stake.test.ts). Energy-pricing laws were already priced by the price engine. Every other bound policy still stands on `boundEmployerCostShare`, so the stopgap row stays open with its text narrowed.
