---
id: laws-overtime-pay-rule
title: "Overtime pay is a law: hours over the law's threshold in a pay week pay at the law's multiple, and exempt salaried jobs are paid by the period"
area: laws
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: 
blocked-on:
milestone:
source: Split from core-stopgap-work-prototype-pay-projection by pool feeder Oct 20; the stand-in research (docs/research/stand-in-figures-2026-10-12.md) notes the DOL state payday and overtime pages as the source
---

**What.** Pay in the work engine is the job's hourly rate times attended minutes (`work-state.ts`), with no overtime and no salaried jobs, because the pay terms are a projected proxy (stopgap SG-P8-work-pay-terms). Add overtime as law data: a series in src/core2/data/laws/starting-law.json for the federal Fair Labor Standards Act (time and a half after 40 hours in a work week) with state rows where a state's law is stricter (a daily threshold, a double-time tier), the exempt salary threshold below which a salaried worker is still owed overtime, and the territories' own rows. Make the work module's pay accrual for a pay period read the law in force at the job's place: hours past the threshold in the week are paid at the multiple, and a job recorded as salaried and above the exempt threshold is paid its period amount whatever the hours. Employer cost follows, so business books and the budget line for a public employer see the higher wage.

**Rules.** One rule, all 56 places: overtime is law rows per jurisdiction in data, with no state named in logic. An effect is a read, not a record: the work pay accrual and the employer's labor cost must read the law row when they pay. No dice: pay follows hours, the recorded pay basis and the law in force. Replace, never layer: the plain hourly product is replaced by the law-reading calculation, not kept as a second path. One model, two tiers: counted workers' wage flows use the same rule times their count. Numbers in the parameter table are SOURCED with citation to the statute or the state labor department.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), a worker whose schedule runs past the law's threshold in a pay week is paid the multiple on the extra hours by payroll journal record id, an exempt salaried job is paid its period amount, the employer's cost in the business book moves with it, and src/core2/overtime-pay.test.ts proves it for a place with a daily-overtime state row and one with only the federal row.

**Files.** src/core2/data/laws/starting-law.json, src/core2/work-state.ts, src/core2/work-pay-period.ts, src/core2/modules/work.ts, src/core2/overtime-pay.test.ts

**Notes.** Split from core-stopgap-work-prototype-pay-projection by pool feeder Oct 20; the stand-in research (docs/research/stand-in-figures-2026-10-12.md) notes the DOL state payday and overtime pages as the source.
