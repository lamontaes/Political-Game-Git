---
id: core-stopgap-work-prototype-pay-projection
title: "Stopgaps in work (prototype-pay-projection): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/work.ts, kind prototype-pay-projection"
after: laws-overtime-pay-rule
claimed-at: 
---

**What.** The work engine projects an hourly wage proxy for the job's occupation onto attended minutes (src/core2/modules/work.ts, `work-state.ts`); no signed hourly or salary agreement, overtime, pay calendar, tax treatment or revenue model is recorded, and same-payer job order is authored. Today cash already follows each employer's recorded payday, so the remaining gap is the pay terms themselves. Give every job a recorded compensation term set when it is filled: the basis (hourly or salaried), the rate the employer offered (the market wage for the occupation and area, adjusted by the employer's own books through `raiseUnfilledPay` in the jobs engine) and the rate the worker accepted, the payday lag the state's pay-timing law allows (some states set a lag after period end, most set a maximum), and the overtime rule from the law (laws-overtime-pay-rule). Payroll and the employer's books read that term, and a raise or a law change writes a new term with its date rather than editing the old. Delete the occupation-proxy path and the stopgap markers in `work.ts` and `work-state.ts` once every job carries a term.

**Rules.** No dice: the offered and accepted rates follow the employer's books, the market wage and the worker's need and traits, never a roll. An effect is a read, not a record: payroll, the employer's labor cost and the tax withholding must read the term. One rule, all 56 places: pay-timing and overtime come from law rows per jurisdiction. Estimate, never UNKNOWN: a job with no observed offer starts from the occupation's published wage (BLS OEWS) with its spread, marked ESTIMATED. Replace, never layer: the proxy path is deleted when the term replaces it. One model, two tiers: a counted job carries the same term as a group row. Numbers in the parameter table are SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), every filled job has a pay-term record id with basis, offered and accepted rates and payday lag, a raise by an employer writes a new dated term that the next payroll record id reads, a law change to the minimum wage re-rates affected terms, the cash journal balances, and src/core2/work-pay-terms.test.ts proves it; the row is resolved in stopgaps.json.

**Files.** src/core2/modules/work.ts, src/core2/work-state.ts, src/core2/modules/jobs.ts, src/core2/work-pay-period.ts, src/core2/data/work.json, src/core2/work-pay-terms.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Projects hourly SOC wage proxies onto actual attended minutes and immediate same-day conserving payment.

Oct 20 (pool feeder): spec written; the row's wording ('immediate same-day payment') is stale: pay already follows the employer payday (work-payroll-cash.ts, work-pay-period.ts); overtime is split out as laws-overtime-pay-rule, which this item reads. Research: docs/research/stand-in-figures-2026-10-12.md says no number fixes this, it is a mechanic.
