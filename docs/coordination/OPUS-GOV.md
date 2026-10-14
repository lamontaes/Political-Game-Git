# OPUS-GOV

## Treasuries

Builder: Claude (Opus, high), branch `gov/treasuries-spend`, PR #4169, started October 14, 2026. No sub-agents built code; one Sonnet reviewer read the report.

What the owner can play now: every treasury pays its budget each month. The town's council budget becomes money that reaches the town's businesses, its staff and the world outside. A federal cut to Social Security lowers the next check of a retiree who claimed during play. Report: `docs/reports/treasuries-2026-10-14/README.md`.

Checklist:

- [x] Monthly treasury close for federal, state, county and city: revenue in, every line out
- [x] Transfers down: federal aid to the state and local treasuries, state aid to the county and town
- [x] In-town lines first: public pay drawn on its line, law-reach benefits, local contractors
- [x] Social Security in town reads the federal line (awards claimed in play; the rest wait on OPUS-CORE)
- [x] Counted workers' withholding; withholding records after the payment; no unmatched lines
- [x] Staff pay checked against its line (defect 19)
- [x] Paid-leave premium cap, bribe record timing, poll cost kind
- [x] Budget notice names its adopter; `departmentRequests` for a bill with no executive
- [x] One-year proof in the played world (Norway, Michigan; Lydia, South Carolina)

Next in this area:

- State surpluses build up where Census revenue exceeds spending: a rainy-day reserve, or the next budget spends it.
- Appointee pay against its line (executive.ts, the other GOV builder's file).

Needs from other sessions:

- OPUS-CORE: `setStandingContractAmount` for recipient-income contracts (SG-GOV-opening-award-level); a rerate for the residents' retirement flows (SG-GOV-counted-social-security-level); public employers paid from their treasury (SG-GOV-public-employers-outside).
- Other GOV builder: a budget bill with no executive carries `departmentRequests` lines (`legislature.ts:439`).

Questions for the owner: none.
