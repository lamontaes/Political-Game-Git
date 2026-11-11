---
id: research-medicaid-spending-per-enrollee-and-plan-payers
title: "Medicaid and the other plans pay a covered member's care at a sourced spending per enrollee, not a share of an out-of-pocket average"
area: core
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10, 2026 (SG-GOV-REACH-B-medicaid-coverage)
lead: laws
model: sonnet
effort: medium
standard: 2
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** Medicaid expansion now covers named and counted adults by person id and the state and federal treasuries pay the seller Medicaid's part of a covered member's care (payMedicaidCare). The part that is still an estimate: the cost of a member's care is the survey's out-of-pocket medical services line divided by the average out-of-pocket share, scaled by each member's care need, so Medicaid's payment per covered adult is far below the real spending per enrollee. Employer plans and Medicare pay nobody for their members' care, and only the expansion's adults are covered, not traditional Medicaid's children, disabled or elderly. Seen: in the state budget he reads (the Medicaid line) and in a household's medical bills when expansion passes.

**Cause.** Found in code: src/core2/medical-bills.ts (header comment and the `payMedicaidCare` call near line 946) prices care from the out-of-pocket line over the average share; src/core2/law-reach/group-b-money.ts `payMedicaidCare` pays only the part above the member's share of that estimated cost; src/core2/data/laws/reach-group-b-parameters.json holds the shares (stand-in SG-GOV-REACH-B-medicaid-coverage).

**Fix.** Research first, then data. (1) Find and quote, from fetched pages, MEPS total expenditure per person by age band and by coverage type (Medicaid, private, Medicare, uninsured) and CMS Medicaid spending per enrollee for the expansion adult group. (2) Add them to the parameter table tagged SOURCED with the citation and spread. (3) Make medical-bills.ts price a member's care at that per-person total for their age band, so the seller is paid the total: the member pays their share and the plan's payer (Medicaid through payMedicaidCare, or the employer plan's insurer or Medicare as an outside payer account) pays the rest. Keep it monthly and by counts; no new per-person loop. Add traditional Medicaid's enrollees only if the same table carries them by age.

**Time box.** 6 hours for one Sonnet session. When it runs out, push the sourced table, set the state honestly with a one-line note, and stop.

**Rules.** Real data calibrates and never decides an outcome (no dice). Every number is SOURCED or ESTIMATED with its spread. Estimate, never UNKNOWN. The bill and the treasuries read one cost, not two.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`) in a place drawn from all 56 with a Medicaid expansion law in force, in a place and seed the builder did not choose, and sees a covered adult's care paid to the seller by the state and federal treasuries at the sourced per-enrollee spending, named by record id, with the treasury totals and the household's smaller bill agreeing with the same world with the law repealed. The year still runs under two minutes on `npm run speed:year`.

**Waits on.** world-medical-spending-categories (in-pr) for the out-of-pocket lines it binds.

**Files.** src/core2/medical-bills.ts, src/core2/law-reach/group-b-money.ts, src/core2/data/laws/reach-group-b-parameters.json, src/core2/data/stopgaps/gov.json
